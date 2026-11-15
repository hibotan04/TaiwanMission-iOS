import { removeCloudAccount } from "./removeCloudAccount";
import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { Purchases, LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { initializeApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  type AuthError,
  deleteUser,
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { listAll, deleteObject, getDownloadURL, getStorage, ref as storageRef, uploadString } from "firebase/storage";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import { CheckCircle2, MapPin, Lightbulb, ChevronLeft, Camera, Upload, Lock, Map, BookOpen, Settings, Mail, LogOut, Trash2, AlertTriangle, FileText, MessageCircle, Sparkles, Cloud, Unlock, Gift, X, ShieldCheck, CreditCard, RefreshCw, BadgeCheck, ImagePlus, Eye, Share2 } from "lucide-react";
import luroufanSticker from "@/imports/stickers/card-01-luroufan.png";
import douhuaSticker from "@/imports/stickers/card-02-douhua.png";
import easycardSticker from "@/imports/stickers/card-03-easycard.png";
import mrtSticker from "@/imports/stickers/card-04-mrt.png";
import nightMarketSticker from "@/imports/stickers/card-05-night-market.png";
import taipei101Sticker from "@/imports/stickers/card-06-taipei101.png";
import teaSticker from "@/imports/stickers/card-07-tea.png";
import teaEggSticker from "@/imports/stickers/card-08-tea-egg.png";
import jiufenSticker from "@/imports/stickers/card-09-jiufen.png";
import danbingSticker from "@/imports/stickers/card-10-danbing.png";
import cksSticker from "@/imports/stickers/card-11-cks.png";
import ntuSticker from "@/imports/stickers/card-12-ntu.png";
import ximenSticker from "@/imports/stickers/card-13-ximen.png";
import sausageSticker from "@/imports/stickers/card-14-sausage.png";
import sweetPotatoSticker from "@/imports/stickers/card-15-sweet-potato.png";
import brandTitle from "@/imports/brand-title.png";
import travelBackground from "@/imports/taiwan-mission-bg.png";
import sweetPotatoPhoto from "@/imports/pictures/焼き芋.png";
import teaBgPhoto from "@/imports/pictures/card-07-tea-bg.jpg";
import ntuBgPhoto from "@/imports/pictures/card-12-ntu-bg.jpg";
import sausageBgPhoto from "@/imports/pictures/card-14-sausage-bg.jpg";
import mrtBgPhoto from "@/imports/pictures/card-04-mrt-bg.jpg";
import ximenBgPhoto from "@/imports/pictures/card-13-ximen-bg.jpg";
import danbingBgPhoto from "@/imports/pictures/card-10-danbing-bg.jpg";
import luroufanBgPhoto from "@/imports/pictures/card-01-luroufan-bg.png";
import douhuaBgPhoto from "@/imports/pictures/card-02-douhua-bg.png";
import easycardBgPhoto from "@/imports/pictures/card-03-easycard-bg.png";
import nightMarketBgPhoto from "@/imports/pictures/card-05-night-market-bg.png";
import taipei101BgPhoto from "@/imports/pictures/card-06-taipei101-bg.png";
import teaEggBgPhoto from "@/imports/pictures/card-08-tea-egg-bg.png";
import jiufenBgPhoto from "@/imports/pictures/card-09-jiufen-bg.png";
import cksBgPhoto from "@/imports/pictures/card-11-cks-bg.png";

// Card IDs that have a real transparent-background sticker PNG
const STICKER_PNG: Record<number, string> = {
  1: luroufanSticker,
  2: douhuaSticker,
  3: easycardSticker,
  4: mrtSticker,
  5: nightMarketSticker,
  6: taipei101Sticker,
  7: teaSticker,
  8: teaEggSticker,
  9: jiufenSticker,
  10: danbingSticker,
  11: cksSticker,
  12: ntuSticker,
  13: ximenSticker,
  14: sausageSticker,
  15: sweetPotatoSticker,
};

// 本番キーは .env（リポジトリルート）の EXPO_PUBLIC_REVENUECAT_IOS_API_KEY から読む。
// フォールバックを置くと、env が読めていないときに気づかないまま課金が壊れるため設定しない。
const REVENUECAT_API_KEY: string | undefined = import.meta.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ENTITLEMENT_ID = import.meta.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "pro";
const REVENUECAT_PRODUCT_ID = import.meta.env.EXPO_PUBLIC_REVENUECAT_PRODUCT_ID || "Premium_lifetime";

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "すべて" | "食べ物" | "スイーツ" | "交通・生活" | "夜市" | "観光地" | "文化" | "コンビニ" | "朝ごはん" | "歴史" | "街歩き";

interface Card {
  id: number; packId: string; name: string; category: Category;
  catchphrase: string; description: string; condition: string;
  area: string; trivia: string;
  accentColor: string; cardPhoto: string;
}

interface Pack {
  id: string; name: string; subtitle: string; available: boolean;
  coverPhoto: string; accentColor: string; borderColor: string;
  isProOnly?: boolean;
}

interface CloudAppData {
  achieved?: number[];
  photos?: Record<string, string>;
  memos?: Record<string, string>;
  stickerPositions?: Record<string, StickerPos>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTACT_FORM_URL = "https://forms.gle/ad5ut7bW1h8MSucZ7";
const MISSION_NAME_BG = "#fffaf0";
const BADGE_FONT = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif";

function centeredBadgeBox(width: number | "auto", height: number, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width,
    minWidth: width === "auto" ? undefined : width,
    height,
    display: "grid",
    placeItems: "center",
    padding: width === "auto" ? "0 10px" : 0,
    boxSizing: "border-box",
    ...extra,
  };
}

function BadgeText({ children, fontSize, color }: { children: string; fontSize: number; color: string }) {
  return (
    <span
      aria-hidden={false}
      style={{
        display: "block",
        height: "1em",
        lineHeight: "1em",
        fontSize,
        color,
        fontWeight: 900,
        fontFamily: BADGE_FONT,
        transform: "translateY(-0.08em)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

const CATEGORY_FILTERS: (Category | "すべて")[] = [
  "すべて","食べ物","夜市","交通・生活","観光地","文化","コンビニ","朝ごはん","歴史","街歩き","スイーツ",
];

// カバー写真はすべてローカルアセット（オフラインの旅行中でも必ず表示される）
const PACKS: Pack[] = [
  { id: "taiwan-basic",  name: "はじめての台湾",     subtitle: "定番ミッション15選",        available: true,  coverPhoto: taipei101BgPhoto, accentColor: "#D43020", borderColor: "#1A2050" },
  { id: "taiwan-convenience", name: "台湾コンビニ編", subtitle: "コンビニで楽しむ台湾の日常", available: true,  coverPhoto: teaEggBgPhoto,    accentColor: "#A07820", borderColor: "#1A2050", isProOnly: false },
  { id: "taiwan-breakfast", name: "台湾の朝ごはん編", subtitle: "朝から幸せローカル朝食",    available: true,  coverPhoto: danbingBgPhoto,   accentColor: "#C8601A", borderColor: "#1A2050", isProOnly: true },
  { id: "taiwan-food",   name: "台湾定番グルメ編",   subtitle: "絶品ローカルフード大集合",  available: false, coverPhoto: luroufanBgPhoto,  accentColor: "#C8601A", borderColor: "#1A2050", isProOnly: true },
  { id: "taiwan-creatures", name: "台湾の生き物（動物）編", subtitle: "台湾固有の豊かな大自然", available: false, coverPhoto: ntuBgPhoto,    accentColor: "#2A7A5A", borderColor: "#1A2050", isProOnly: true },
  { id: "taiwan-daily",  name: "台湾の日常編",       subtitle: "現地のローカルライフを体験", available: false, coverPhoto: mrtBgPhoto,       accentColor: "#1A5A7A", borderColor: "#1A2050", isProOnly: true },
  { id: "hualien",       name: "花蓮編",             subtitle: "大自然と大理石の街へ",      available: false, coverPhoto: jiufenBgPhoto,    accentColor: "#8A3A6A", borderColor: "#1A2050", isProOnly: true },
  { id: "taichung",      name: "台中編",             subtitle: "アートとタピオカ発祥の地",  available: false, coverPhoto: teaBgPhoto,       accentColor: "#3A7A3A", borderColor: "#1A2050", isProOnly: true },
];

const CARDS: Card[] = [
  { id:1,  packId:"taiwan-basic", name:"滷肉飯を食べる",       category:"食べ物",    catchphrase:"台湾ローカル飯の第一歩",            description:"甘じょっぱい豚肉をご飯にのせた、台湾の定番ローカル飯を味わってみよう。小さな一杯から、台湾の食文化にふれられるミッション。", condition:"滷肉飯を注文して食べる",            area:"ローカル食堂・夜市・台北市内",   trivia:"お店によって肉の大きさ、脂の量、甘さがかなり違う。",                       accentColor:"#C8601A", cardPhoto:luroufanBgPhoto },
  { id:2,  packId:"taiwan-basic", name:"豆花を食べる",          category:"スイーツ",  catchphrase:"ほんのり甘い、台湾の伝統スイーツ",   description:"ふるふる食感の豆花に、ピーナッツやタピオカ、芋圓などのトッピングをのせて味わってみよう。やさしい甘さで台湾らしい伝統的なスイーツ。", condition:"豆花を注文して食べる",             area:"豆花専門店・夜市",               trivia:"冷たい豆花と温かい豆花があり、季節によって楽しみ方が変わる。",               accentColor:"#B0456A", cardPhoto:douhuaBgPhoto },
  { id:3,  packId:"taiwan-basic", name:"悠遊卡デビュー",        category:"交通・生活",catchphrase:"台湾旅の相棒を使いこなそう",         description:"台湾の交通系ICカード「悠遊卡」を使って、MRTやバス、コンビニで支払いをしてみよう。台湾旅行がぐっとスムーズになる。", condition:"悠遊卡で支払いをする",             area:"MRT・バス・コンビニ",            trivia:"交通だけでなく、コンビニや一部のお店でも使える。",                           accentColor:"#1A7A5E", cardPhoto:easycardBgPhoto },
  { id:4,  packId:"taiwan-basic", name:"MRTで街へ出る",         category:"交通・生活",catchphrase:"地下鉄に乗れば、台湾の街が広がる",  description:"台北や高雄のMRTに乗って、自分の力で街を移動してみよう。駅の案内や整列文化も台湾旅行の一部。", condition:"MRTに乗って1駅以上移動する",     area:"台北MRT・高雄MRT",               trivia:"MRTの車内や駅構内では飲食が禁止されている。",                               accentColor:"#2A4A8A", cardPhoto:mrtBgPhoto },
  { id:5,  packId:"taiwan-basic", name:"夜市を歩く",             category:"夜市",     catchphrase:"台湾の夜は、屋台から始まる",         description:"台湾旅行の定番、夜市を歩いてみよう。屋台の音、におい、人の多さ、看板の光まで含めて台湾らしい体験になる。", condition:"夜市を訪れる",                     area:"士林夜市・寧夏夜市・饒河街夜市", trivia:"夜市ごとに有名グルメや雰囲気が違う。",                                       accentColor:"#D43020", cardPhoto:nightMarketBgPhoto },
  { id:6,  packId:"taiwan-basic", name:"台北101を撮る",          category:"観光地",   catchphrase:"台湾のランドマークに会いに行こう",  description:"台湾を代表する高層ビル、台北101を写真に収めよう。近くから見上げても、少し離れた場所から撮っても達成できる。", condition:"台北101の写真を撮る",             area:"台北101・信義区・象山",          trivia:"象山から見る台北101は、夜景スポットとしても人気。",                         accentColor:"#1A5A7A", cardPhoto:taipei101BgPhoto },
  { id:7,  packId:"taiwan-basic", name:"台湾茶を楽しむ",         category:"文化",     catchphrase:"香りで味わう、台湾の時間",           description:"烏龍茶や高山茶など、台湾のお茶を飲んでみよう。茶芸館でゆっくり味わっても、ドリンクスタンドで気軽に飲んでもOK。", condition:"台湾茶を飲む",                     area:"茶芸館・猫空・ドリンクスタンド", trivia:"台湾茶は、味だけでなく香りの違いを楽しむ文化がある。",                     accentColor:"#3A7A3A", cardPhoto:teaBgPhoto },
  { id:8,  packId:"taiwan-basic", name:"茶葉蛋に挑戦",           category:"コンビニ", catchphrase:"台湾コンビニの香りの正体",           description:"台湾のコンビニでよく見かける茶葉蛋を食べてみよう。お茶やスパイスで煮込まれた卵は、台湾の日常を感じる一品。", condition:"コンビニで茶葉蛋を買って食べる",   area:"7-ELEVEN・全家",                 trivia:"コンビニに入ったときの独特な香りは、茶葉蛋から来ていることが多い。",       accentColor:"#A07820", cardPhoto:teaEggBgPhoto },
  { id:9,  packId:"taiwan-basic", name:"九份の路地を歩く",        category:"観光地",   catchphrase:"提灯の灯る坂道へ",                  description:"赤い提灯、細い路地、海の見える景色が魅力の九份を歩いてみよう。台湾旅行らしい写真が残せる定番スポット。", condition:"九份を訪れる",                     area:"九份老街",                       trivia:"夕方から夜にかけては提灯が映えるが、人も多くなりやすい。",                 accentColor:"#D43020", cardPhoto:jiufenBgPhoto },
  { id:10, packId:"taiwan-basic", name:"蛋餅を食べる",            category:"朝ごはん", catchphrase:"台湾の朝は、もちもち卵クレープから", description:"台湾朝ごはんの定番、蛋餅を食べてみよう。もちっとした生地と卵の組み合わせで、気軽に楽しめるローカル朝食。", condition:"朝食店で蛋餅を注文して食べる",     area:"台湾式朝食店",                   trivia:"チーズ、ツナ、コーンなど様々な具材を選べる。とろみのある台湾式の甘い醤油（醤油膏）をたっぷりかけて食べるのが現地流のおいしい食べ方。",                         accentColor:"#C8601A", cardPhoto:danbingBgPhoto },
  { id:11, packId:"taiwan-basic", name:"中正紀念堂を訪れる",      category:"歴史",     catchphrase:"広場で台湾の歴史にふれる",           description:"台北の代表的な観光地、中正紀念堂を訪れてみよう。大きな広場や展示を通して、台湾の歴史について考えるきっかけになる。", condition:"中正紀念堂を訪れる",             area:"中正紀念堂・自由広場",              trivia:"実際に見上げると巨大な白亜の建築と迫力に圧倒される。広大な敷地（自由広場）にはリスや野生の鳥たちが暮らしており、散歩にも最適。また、夜は美しくライトアップされる隠れた名所（※夜間は本堂の門が閉まるため、蒋介石の巨大銅像は見られません）。",                                         accentColor:"#2A4A8A", cardPhoto:cksBgPhoto },
  { id:12, packId:"taiwan-basic", name:"台湾大学を歩く",           category:"街歩き",   catchphrase:"台湾ナンバーワン大学をのぞいてみよう",description:"台湾大学のキャンパスを歩き、メイン図書館を見に行こう。学生の雰囲気や歴史ある建物を感じられる、少し知的な街歩きミッション。", condition:"台湾大学のメイン図書館を見る",   area:"台湾大学キャンパス・メイン図書館・醉月湖",             trivia:"日本統治時代に設立された「旧帝国大学」の1つ（台北帝国大学）が前身。メイン図書館の地下には24時間開放の自習室があり、外部からその熱心な勉強風景の様子をのぞき見ることができる（※自習室内への立ち入りは不可）。",                 accentColor:"#3A7A3A", cardPhoto:ntuBgPhoto },
  { id:13, packId:"taiwan-basic", name:"西門を歩く",               category:"街歩き",   catchphrase:"台湾の原宿でポップカルチャー探し",  description:"台湾の若者文化が集まる西門を歩いてみよう。アニメ、映画、ファッション、ストリート感のある街並みを楽しめる。", condition:"西門を訪れて街歩きする",         area:"西門町",                         trivia:"「台湾の原宿」や「台湾の渋谷」とも呼ばれ、若者向けの最先端ファッション、アニメショップ、ポップカルチャーの店が立ち並ぶ。また、古くから映画館街としても非常に有名。",               accentColor:"#8A3A6A", cardPhoto:ximenBgPhoto },
  { id:14, packId:"taiwan-basic", name:"大腸包小腸を食べる",       category:"夜市",     catchphrase:"台湾式もち米ホットドッグに挑戦",     description:"もち米の腸詰めでソーセージを挟んだ、台湾夜市らしいグルメを食べてみよう。見た目のインパクトもあり、旅の思い出に残りやすい。", condition:"夜市や屋台で大腸包小腸を食べる", area:"夜市・屋台",                     trivia:"生のにんにくが置いてある店では、齧りながら食べるのが現地流の楽しみ方。",   accentColor:"#C8601A", cardPhoto:sausageBgPhoto },
  { id:15, packId:"taiwan-basic", name:"コンビニで焼き芋を食べる",  category:"コンビニ", catchphrase:"ほくほく甘い、台湾コンビニの定番",  description:"台湾のコンビニで売られている焼き芋を食べてみよう。甘くてほくほくしたサツマイモは、台湾の日常を感じられる軽食。", condition:"コンビニで焼き芋を買って食べる", area:"7-ELEVEN・全家",              trivia:"台湾では皮ごと焼き芋を食べる人が多い。コンビニのレジ横などにある石焼き芋が驚くほど甘くて絶品。茶葉蛋と並んで、台湾のコンビニを訪れたら絶対に試すべき名物グルメの1つ。",         accentColor:"#7A4A1A", cardPhoto:sweetPotatoPhoto },

  // ── 台湾コンビニ編（id 16〜25）──────────────────────────────────────────
  // TODO: cardPhoto は仮画像。専用写真を src/imports/pictures/ に追加したら差し替える
  { id:16, packId:"taiwan-convenience", name:"黑松沙士を飲んでみる",   category:"コンビニ", catchphrase:"台湾の国民的ソーダに挑戦",           description:"台湾で90年以上愛され続ける炭酸飲料「黑松沙士」を飲んでみよう。日本では出会えない独特の風味は、好きか苦手かで盛り上がれる台湾の日常の味。", condition:"コンビニで黑松沙士を買って飲む",     area:"7-ELEVEN・全家・スーパー",      trivia:"ルートビアに近い独特の香りで、初めての人は驚くことが多い。喉にいいとされ、塩をひとつまみ入れて飲む台湾式の飲み方もある。",                     accentColor:"#1A2050", cardPhoto:teaBgPhoto },
  { id:17, packId:"taiwan-convenience", name:"御飯糰を食べる",         category:"コンビニ", catchphrase:"台湾流おにぎりはボリューム満点",     description:"台湾のコンビニおにぎり「御飯糰」を食べてみよう。日本のおにぎりとはひと味違う、台湾らしい具材や紫米（もち米）の食感が楽しめる。", condition:"コンビニで御飯糰を買って食べる",     area:"7-ELEVEN・全家",                 trivia:"人気は紫米御飯糰。油條（揚げパン）や肉鬆（豚肉でんぶ）が丸ごと入った、朝食屋さん顔負けの大型サイズも売られている。",                         accentColor:"#7A4A1A", cardPhoto:luroufanBgPhoto },
  { id:18, packId:"taiwan-convenience", name:"関東煮に挑戦",           category:"コンビニ", catchphrase:"台湾式おでんはセルフが基本",         description:"台湾のコンビニおでん「関東煮」を食べてみよう。レジ横の鍋から自分で具材を取るセルフ式で、日本にはない具材との出会いも楽しい。", condition:"コンビニで関東煮を買って食べる",     area:"7-ELEVEN・全家",                 trivia:"台湾語で「黑輪（オレン）」と呼ばれる具もあり、語感は日本語の「おでん」が由来。甜辣醬（甘辛だれ）をかけるのが現地流。",                       accentColor:"#A82818", cardPhoto:teaEggBgPhoto },
  { id:19, packId:"taiwan-convenience", name:"CITY CAFEを注文する",    category:"コンビニ", catchphrase:"街じゅうがカフェになるコーヒー",     description:"セブンイレブンのカウンターコーヒー「CITY CAFE」を注文してみよう。レジで頼むだけで、淹れたてが数十元で楽しめる台湾の定番。", condition:"セブンイレブンでCITY CAFEを買う",   area:"7-ELEVEN",                       trivia:"「整個城市都是我的咖啡館（街全体が私のカフェ）」というCMコピーは台湾で知らない人がいないほど有名。",                                         accentColor:"#5A3A1A", cardPhoto:teaBgPhoto },
  { id:20, packId:"taiwan-convenience", name:"「要微波嗎？」を聞き取る", category:"コンビニ", catchphrase:"レジで聞こえる魔法のフレーズ",       description:"コンビニでお弁当やおにぎりを買うと、店員さんが「要微波嗎？（温めますか？）」と聞いてくれる。聞き取って答えられたらミッション達成！", condition:"温めが必要な商品を買って質問に答える", area:"7-ELEVEN・全家",               trivia:"「要（ヤオ）」＝お願いします、「不用（ブーヨン）」＝大丈夫です。この2語だけで台湾のコンビニ会話はほぼ完璧。",                                 accentColor:"#2A4A8A", cardPhoto:easycardBgPhoto },
  { id:21, packId:"taiwan-convenience", name:"統一布丁を食べる",       category:"コンビニ", catchphrase:"台湾人みんなが知ってる黄色いプリン", description:"台湾の国民的プリン「統一布丁」を食べてみよう。コンビニのスイーツ棚に必ずある黄色いカップは、台湾人の子ども時代の味。", condition:"コンビニで統一布丁を買って食べる",   area:"7-ELEVEN・全家",                 trivia:"そのまま食べる以外に、ミルクティーに丸ごと入れる「布丁奶茶」というアレンジも台湾では定番。",                                                 accentColor:"#C8A030", cardPhoto:douhuaBgPhoto },
  { id:22, packId:"taiwan-convenience", name:"全家の入店音を聞く",     category:"コンビニ", catchphrase:"台湾でも流れる、あのメロディー",     description:"台湾のファミリーマート「全家」に入って、入店音を聞いてみよう。日本と同じあのメロディーが異国で流れる、ちょっと不思議で安心する瞬間。", condition:"全家に入店する",                   area:"全家（ファミリーマート）",       trivia:"台湾の全家は約4,000店舗。「全家就是你家（ファミマはあなたの家）」というスローガンも有名。",                                                   accentColor:"#1A5A7A", cardPhoto:easycardBgPhoto },
  { id:23, packId:"taiwan-convenience", name:"イートインでひと休み",   category:"コンビニ", catchphrase:"旅の途中の止まり木スポット",         description:"台湾のコンビニはイートイン席がとても充実している。買ったものを座って食べながら、窓の外の台湾の街を眺めてひと休みしよう。", condition:"コンビニのイートイン席を利用する",   area:"7-ELEVEN・全家",                 trivia:"台湾のコンビニはイートイン併設率が高く、夜は勉強する学生の姿も。冷房が効いていて、夏の街歩きの避難所としても優秀。",                         accentColor:"#3A7A3A", cardPhoto:sweetPotatoPhoto },
  { id:24, packId:"taiwan-convenience", name:"統一發票をもらう",       category:"コンビニ", catchphrase:"レシートが宝くじになる国",           description:"台湾では買い物のレシート（統一發票）がそのまま宝くじになっている。レシートを受け取って、番号をチェックしてみよう。", condition:"買い物をして統一發票を受け取る",     area:"コンビニ・スーパー・飲食店",     trivia:"2ヶ月に1度抽選があり、最高賞金は1,000万元（約5,000万円）。脱税防止のために始まった世界的にも珍しい制度。",                                   accentColor:"#D43020", cardPhoto:easycardBgPhoto },
  { id:25, packId:"taiwan-convenience", name:"ibonをさわってみる",     category:"コンビニ", catchphrase:"台湾コンビニの万能マシン",           description:"セブンイレブンに置かれている緑色の端末「ibon」を操作してみよう。チケット購入から宅配便まで、台湾の生活を支える万能マシン。", condition:"ibonで画面を操作してみる",           area:"7-ELEVEN",                       trivia:"台鐵・高鐵のチケット受け取りや、コンサートのチケット購入もここで完結。旅行者には鉄道チケットの発券が特に便利。",                             accentColor:"#1A7A5E", cardPhoto:easycardBgPhoto },

  // ── 台湾の朝ごはん編（id 26〜35）────────────────────────────────────────
  // TODO: cardPhoto は仮画像。専用写真を src/imports/pictures/ に追加したら差し替える
  { id:26, packId:"taiwan-breakfast", name:"豆漿を飲む",             category:"朝ごはん", catchphrase:"台湾の朝は豆乳から始まる",           description:"台湾の朝ごはんの大定番、豆漿（豆乳）を飲んでみよう。温かい熱豆漿も、冷たい冰豆漿もあり、ほんのり甘くて日本の豆乳より飲みやすい。", condition:"朝食店で豆漿を注文して飲む",         area:"台湾式朝食店・豆漿店",           trivia:"甘さを調整して注文でき、「無糖」「半糖」も選べる。朝食店では豆漿に油條を浸して食べるのが昔ながらのスタイル。",                               accentColor:"#C8A030", cardPhoto:douhuaBgPhoto },
  { id:27, packId:"taiwan-breakfast", name:"鹹豆漿に挑戦",           category:"朝ごはん", catchphrase:"飲む豆乳から「食べる豆乳」へ",       description:"豆乳に酢を加えてふるふるに固めた「鹹豆漿（しょっぱい豆乳）」に挑戦しよう。油條、ねぎ、干しエビが入った、おぼろ豆腐のような台湾の伝統朝食。", condition:"朝食店で鹹豆漿を注文して食べる",     area:"台湾式朝食店・豆漿店",           trivia:"酢の力で豆乳がとろりと固まる、ちょっと不思議な一品。ラー油を少し垂らすのが現地流のおいしい食べ方。",                                         accentColor:"#B0456A", cardPhoto:douhuaBgPhoto },
  { id:28, packId:"taiwan-breakfast", name:"焼餅油條を食べる",       category:"朝ごはん", catchphrase:"サクサク×サクサクの伝統コンビ",      description:"パイのような焼餅に、揚げパンの油條を挟んだ「焼餅油條」を食べてみよう。香ばしさの二重奏が楽しめる、昔ながらの台湾の朝ごはん。", condition:"朝食店で焼餅油條を食べる",           area:"台湾式朝食店・豆漿店",           trivia:"注文するときは「燒餅夾油條（シャオビン・ジャー・ヨウティアオ）」。豆漿に浸しながら食べる人も多い。",                                         accentColor:"#C8601A", cardPhoto:danbingBgPhoto },
  { id:29, packId:"taiwan-breakfast", name:"飯糰を食べる",           category:"朝ごはん", catchphrase:"その場で握る、もちもち爆弾おにぎり", description:"もち米で油條や肉鬆、酸菜を包み込む台湾式おにぎり「飯糰」を食べてみよう。ずっしり重くて食べごたえ抜群、これひとつで朝から大満足。", condition:"朝食店で飯糰を注文して食べる",       area:"台湾式朝食店・飯糰専門店",       trivia:"注文を受けてからその場で握ってくれるのが朝食店スタイル。紫米（黒もち米）を選べる店や、チーズ・卵入りのアレンジも人気。",                     accentColor:"#7A4A1A", cardPhoto:luroufanBgPhoto },
  { id:30, packId:"taiwan-breakfast", name:"蘿蔔糕を食べる",         category:"朝ごはん", catchphrase:"鉄板で焼く、もちもち大根餅",         description:"大根入りの米粉の生地を鉄板でカリッと焼いた「蘿蔔糕（大根餅）」を食べてみよう。外はカリカリ、中はもちもちの台湾朝食の人気者。", condition:"朝食店で蘿蔔糕を注文して食べる",     area:"台湾式朝食店",                   trivia:"とろみ醤油（醤油膏）とにんにくだれをかけるのが定番。「加蛋（ジャーダン）」と言えば目玉焼きをのせてくれる。",                                 accentColor:"#3A7A3A", cardPhoto:danbingBgPhoto },
  { id:31, packId:"taiwan-breakfast", name:"鐵板麺を食べる",         category:"朝ごはん", catchphrase:"朝から麺！台湾式鉄板焼きそば",       description:"熱い鉄板で提供される台湾式焼きそば「鐵板麺」を食べてみよう。朝から麺を食べる文化は、台湾の朝食店ならではの体験。", condition:"朝食店で鐵板麺を注文して食べる",     area:"台湾式朝食店",                   trivia:"ソースは黒胡椒とマッシュルーム（蘑菇）の2択が定番。目玉焼きをのせて、半熟の黄身を絡めて食べるのが現地流。",                                   accentColor:"#A82818", cardPhoto:danbingBgPhoto },
  { id:32, packId:"taiwan-breakfast", name:"台湾式バーガーを食べる", category:"朝ごはん", catchphrase:"朝ごはん屋の意外な定番メニュー",     description:"台湾の朝食店には必ずと言っていいほどハンバーガー（漢堡）がある。ふわふわのバンズに台湾らしい具材を挟んだ、朝食バーガーを試してみよう。", condition:"朝食店で漢堡を注文して食べる",       area:"台湾式朝食店・美而美系チェーン", trivia:"豚肉の照り焼き風「豬肉漢堡」が定番。ピーナッツバター入りなど、日本のハンバーガーの常識を超える組み合わせも。",                               accentColor:"#C8601A", cardPhoto:danbingBgPhoto },
  { id:33, packId:"taiwan-breakfast", name:"「內用」「外帶」を言う", category:"朝ごはん", catchphrase:"注文の魔法のことばを覚えよう",       description:"店内で食べるなら「內用（ネイヨン）」、持ち帰りなら「外帶（ワイダイ）」。台湾の飲食店で必ず聞かれるこの質問に、中国語で答えてみよう。", condition:"注文時に內用か外帶を自分で言う",     area:"朝食店・飲食店全般",             trivia:"この2語さえ覚えれば台湾の飲食店の9割で困らない。聞き取れなくても、先に自分から言ってしまえばOK。",                                           accentColor:"#2A4A8A", cardPhoto:danbingBgPhoto },
  { id:34, packId:"taiwan-breakfast", name:"行列の人気店に並ぶ",     category:"朝ごはん", catchphrase:"行列は美味しさの証明",               description:"台湾の有名朝食店には、朝から長い行列ができる。地元の人や旅行者と一緒に並んで、行列の先にある一皿を味わってみよう。", condition:"行列のできる朝食店に並んで食べる",   area:"阜杭豆漿（台北）など各地の人気店", trivia:"華山市場2階の阜杭豆漿は朝5時半開店で、休日は1時間待ちも。厚餅夾蛋（焼きパンの卵挟み）が看板メニュー。",                                       accentColor:"#D43020", cardPhoto:danbingBgPhoto },
  { id:35, packId:"taiwan-breakfast", name:"朝食店の奶茶を飲む",     category:"朝ごはん", catchphrase:"台湾朝食店の甘い相棒",               description:"朝食店の奶茶（ミルクティー）を飲んでみよう。タピオカミルクティーとはまた違う、素朴で懐かしい甘さが台湾の朝の味。", condition:"朝食店で奶茶を注文して飲む",         area:"台湾式朝食店",                   trivia:"朝食店の奶茶は紅茶＋粉ミルクの素朴な味が主流。蛋餅や鐵板麺との組み合わせは台湾の学生の定番セット。",                                         accentColor:"#A07820", cardPhoto:teaBgPhoto },
];

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  teal:       "var(--tm-bg, #32B4AE)",
  tealDark:   "var(--tm-bg-dark, #28918C)",
  tealDeep:   "var(--tm-teal-deep, #1A6A66)",
  cream:      "var(--tm-cream, #F2E3BF)",
  creamDark:  "var(--tm-cream-dark, #E5D0A0)",
  red:        "var(--tm-red, #D43020)",
  redDark:    "var(--tm-red-dark, #A82818)",
  banner:     "var(--tm-banner, #D43020)",
  navy:       "var(--tm-navy, #1A2050)",
  navyLight:  "var(--tm-navy-light, #2A3070)",
  notePaper:  "var(--tm-note-paper, #F8F2E2)",
  mutedInk:   "#8B8E9A",
  gold:       "var(--tm-gold, #F0C030)",
  white:      "var(--tm-white, #FDFAF3)",
};

interface DesignSettings {
  bg: string;
  cream: string;
  notebookPaper: string;
  red: string;
  banner: string;
  navy: string;
  gold: string;
  tileSize: number;
  cardRadius: number;
  cardBorder: number;
  hideMissionNames?: boolean;
}

const DESIGN_KEY = "tw_design_v2";
const DEFAULT_DESIGN: DesignSettings = {
  bg: "#32B4AE",
  cream: "#fbf4e5",
  notebookPaper: "#fbf4e5",
  red: "#ae2013",
  banner: "#e6b919",
  navy: "#3b675a",
  gold: "#F0C030",
  tileSize: 73,
  cardRadius: 16,
  cardBorder: 4,
  hideMissionNames: false,
};

function loadDesignSettings(): DesignSettings {
  try {
    const raw = localStorage.getItem(DESIGN_KEY);
    return raw ? { ...DEFAULT_DESIGN, ...JSON.parse(raw) } : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
}

function shade(hex: string, amount: number) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean, 16);
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp((value >> 16) + amount);
  const g = clamp(((value >> 8) & 255) + amount);
  const b = clamp((value & 255) + amount);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function getFirebaseServices() {
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
    throw new Error("Firebaseの設定が読み込めていません。リポジトリルートの .env を確認してビルドし直してください。");
  }
  const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
  let auth;
  const isNative = Capacitor.isNativePlatform();
  try {
    auth = initializeAuth(app, {
      persistence: isNative ? inMemoryPersistence : indexedDBLocalPersistence,
    });
  } catch {
    auth = getAuth(app);
  }
  const db = getFirestore(app);
  const storage = getStorage(app);
  return { auth, db, storage };
}

function providerToAuthProvider(user: User | null): AuthProvider {
  const providerId = user?.providerData?.[0]?.providerId;
  if (providerId === "google.com") return "google";
  if (providerId === "apple.com") return "apple";
  if (providerId === "password") return "email";
  return "guest";
}

function normalizeRecordKeys<T>(record: Record<string, T> | undefined): Record<number, T> {
  const next: Record<number, T> = {};
  Object.entries(record ?? {}).forEach(([key, value]) => {
    next[Number(key)] = value;
  });
  return next;
}

// 写真は端末(localStorage)にもクラウドにも data URL のまま保存されるため、
// 保存前に必ず縮小する。長辺1500px・JPEG品質0.82で、スマホ写真の数MBを数百KBに抑える。
const PHOTO_MAX_EDGE = 1500;
const PHOTO_JPEG_QUALITY = 0.82;

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas 2d context unavailable");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = objectUrl;
  });
}

// 圧縮に失敗した場合（特殊フォーマット等）だけ、元ファイルをそのまま読む
async function photoFileToDataUrl(file: File): Promise<string> {
  try {
    return await compressImageFile(file);
  } catch (error) {
    console.warn("Photo compression failed; falling back to the original file.", error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error("ファイルを読み込めませんでした"));
      reader.readAsDataURL(file);
    });
  }
}

// ─── Share image ──────────────────────────────────────────────────────────────
// 達成カードをSNS用の1枚画像（1080x1500 JPEG）にCanvasで描き出してシェアする

const SHARE_HASHTAG_TEXT = "#台湾ミッション図鑑 #台湾旅行";

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("シェア画像の素材を読み込めませんでした"));
    img.src = src;
  });
}

async function generateShareCardImage(card: Card, photoUrl?: string): Promise<string> {
  // Webフォント（Zen Maru Gothic）が読めていればCanvasでも使われる。未ロードでも代替フォントで描く
  await (document.fonts?.ready ?? Promise.resolve()).catch(() => {});
  const FONT = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif";
  const W = 1080;
  const H = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  // 背景（クリーム）
  ctx.fillStyle = "#F2E3BF";
  ctx.fillRect(0, 0, W, H);

  // 写真カード本体
  const photo = await loadImageElement(photoUrl || card.cardPhoto);
  const cx = 60, cy = 60, cw = W - 120, ch = 1180, radius = 44;

  ctx.save();
  roundRectPath(ctx, cx, cy, cw, ch, radius);
  ctx.clip();
  const scale = Math.max(cw / photo.naturalWidth, ch / photo.naturalHeight);
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  ctx.drawImage(photo, cx + (cw - dw) / 2, cy + (ch - dh) / 2, dw, dh);
  // 下部を暗くしてプレートを読みやすく
  const grad = ctx.createLinearGradient(0, cy + ch - 380, 0, cy + ch);
  grad.addColorStop(0, "rgba(26,32,80,0)");
  grad.addColorStop(1, "rgba(26,32,80,0.78)");
  ctx.fillStyle = grad;
  ctx.fillRect(cx, cy + ch - 380, cw, 380);
  ctx.restore();

  // 紺の縁取り
  roundRectPath(ctx, cx, cy, cw, ch, radius);
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#1A2050";
  ctx.stroke();

  // ミッション名プレート（写真内・下部）
  const plateW = cw - 120, plateH = 130, plateX = cx + 60, plateY = cy + ch - plateH - 56;
  roundRectPath(ctx, plateX, plateY, plateW, plateH, 26);
  ctx.fillStyle = "#fffaf0";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#1A2050";
  ctx.stroke();
  ctx.fillStyle = "#1A2050";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let nameSize = 60;
  ctx.font = `900 ${nameSize}px ${FONT}`;
  while (ctx.measureText(card.name).width > plateW - 80 && nameSize > 30) {
    nameSize -= 2;
    ctx.font = `900 ${nameSize}px ${FONT}`;
  }
  ctx.fillText(card.name, plateX + plateW / 2, plateY + plateH / 2 + 4);

  // 達成リボン（左上・少し傾ける）
  ctx.save();
  ctx.translate(cx + 130, cy + 110);
  ctx.rotate(-0.16);
  const ribbonW = 240, ribbonH = 92;
  roundRectPath(ctx, -ribbonW / 2, -ribbonH / 2, ribbonW, ribbonH, 18);
  ctx.fillStyle = "#D43020";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 52px ${FONT}`;
  ctx.fillText("達成！", 0, 4);
  ctx.restore();

  // フッター（ブランド）
  ctx.fillStyle = "#1A2050";
  ctx.font = `900 58px ${FONT}`;
  ctx.fillText("台湾ミッション図鑑", W / 2, 1330);
  ctx.fillStyle = "#1A6A66";
  ctx.font = `700 34px 'Nunito', ${FONT}`;
  ctx.fillText("TAIWAN MISSION ｜ 旅の思い出をシールで集めよう", W / 2, 1408);

  return canvas.toDataURL("image/jpeg", 0.9);
}

async function shareAchievedCard(card: Card, photoUrl?: string) {
  const dataUrl = await generateShareCardImage(card, photoUrl);
  const text = `「${card.name}」を達成しました！🇹🇼 ${SHARE_HASHTAG_TEXT}`;

  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: `taiwan-mission-share-${card.id}.jpg`,
      data: dataUrl.split(",")[1],
      directory: Directory.Cache,
    });
    await Share.share({ text, files: [written.uri] });
    return;
  }

  // Webフォールバック：Web Share API → ダウンロード
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `taiwan-mission-${card.id}.jpg`, { type: "image/jpeg" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ text, files: [file] });
  } else {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `taiwan-mission-${card.id}.jpg`;
    a.click();
  }
}

async function uploadPhotosForCloud(uid: string, photos: Record<number, string>) {
  const { storage } = getFirebaseServices();
  const uploaded: Record<number, string> = {};
  for (const [id, url] of Object.entries(photos)) {
    if (!url) continue;
    if (!url.startsWith("data:")) {
      uploaded[Number(id)] = url;
      continue;
    }
    const ref = storageRef(storage, `users/${uid}/mission-photos/${id}.jpg`);
    await uploadString(ref, url, "data_url");
    uploaded[Number(id)] = await getDownloadURL(ref);
  }
  return uploaded;
}

async function saveCloudData(uid: string, data: {
  achieved: Set<number>;
  photos: Record<number, string>;
  memos: Record<number, string>;
  stickerPositions: Record<number, StickerPos>;
}) {
  const { db } = getFirebaseServices();
  const cloudPhotos = await uploadPhotosForCloud(uid, data.photos);
  await setDoc(doc(db, "users", uid, "appData", "main"), {
    achieved: Array.from(data.achieved),
    photos: cloudPhotos,
    memos: data.memos,
    stickerPositions: data.stickerPositions,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return cloudPhotos;
}

async function loadCloudData(uid: string): Promise<CloudAppData | null> {
  const { db } = getFirebaseServices();
  const snap = await getDoc(doc(db, "users", uid, "appData", "main"));
  return snap.exists() ? snap.data() as CloudAppData : null;
}

async function signInWithNativeOAuth(provider: "apple" | "google") {
  const { auth } = getFirebaseServices();

  // GoogleのclientIdは capacitor.config.json の plugins.FirebaseAuthentication.google.clientId から読まれる
  const result = provider === "google"
    ? await FirebaseAuthentication.signInWithGoogle({
        scopes: ["email", "profile"],
      })
    : await FirebaseAuthentication.signInWithApple({ 
        scopes: ["email", "name"],
        skipNativeAuth: true
      });
  
  const credential = result.credential;

  if (!credential?.idToken) {
    throw new Error("ログイン情報を受け取れませんでした。FirebaseとiOSのログイン設定を確認してください。");
  }

  const firebaseCredential = provider === "google"
    ? GoogleAuthProvider.credential(credential.idToken, credential.accessToken)
    : new OAuthProvider("apple.com").credential({
        idToken: credential.idToken,
        rawNonce: credential.nonce,
      });

  await signInWithCredential(auth, firebaseCredential);
}

function authErrorMessage(error: unknown) {
  const code = (error as AuthError | undefined)?.code;
  if (code === "auth/email-already-in-use") return "このメールアドレスはすでに登録されています。ログインに切り替えてください。";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "メールアドレスまたはパスワードが違います。";
  if (code === "auth/user-not-found") return "このメールアドレスのアカウントが見つかりません。";
  if (code === "auth/weak-password") return "パスワードは6文字以上にしてください。";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "ログインがキャンセルされました。";
  if (code === "auth/operation-not-allowed") return "Firebaseでこのログイン方法が有効になっていません。Sign-in methodを確認してください。";
  if (code === "auth/unauthorized-domain") return "Firebaseの承認済みドメイン設定が足りません。ログイン方式の設定を確認してください。";
  const message = error instanceof Error ? error.message : "ログインに失敗しました。少し時間をおいてもう一度お試しください。";
  return code ? `${message}（${code}）` : message;
}

// ─── Card styles ──────────────────────────────────────────────────────────────

function DotOverlay() {
  return <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle, ${C.cream} 1px, transparent 1px)`, backgroundSize: "7px 7px", opacity: 0.22 }}/>;
}

/* ── シール風 ────────────────────────────────────────────── */
function StickerCard({ card, unlocked, photoUrl, hideMissionNames }: { card: Card; unlocked: boolean; photoUrl?: string; hideMissionNames?: boolean }) {
  const photo = photoUrl || card.cardPhoto;
  const borderCol = unlocked ? C.navy : "rgba(26,32,80,0.3)";
  return (
    <div className="relative w-full aspect-[3/4] cursor-pointer select-none overflow-hidden"
      style={{ borderRadius: "var(--tm-card-radius, 16px)", border: `var(--tm-card-border, 4px) solid ${borderCol}`, boxShadow: unlocked ? `0 0 0 2px ${C.cream}, 0 0 0 5px ${borderCol}, 0 6px 18px rgba(26,32,80,0.2)` : `0 0 0 2px ${C.cream}, 0 0 0 4px rgba(26,32,80,0.2), 0 4px 10px rgba(0,0,0,0.28)` }}
    >
      <img src={photo} alt={card.name} className="absolute inset-0 w-full h-full object-cover"/>
      {!unlocked && <div className="absolute inset-0" style={{ background: "rgba(26,32,80,0.5)" }}/>}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26,32,80,0.88) 0%, rgba(26,32,80,0.1) 50%, rgba(0,0,0,0) 100%)" }}/>
      {!unlocked && <DotOverlay/>}
      
      {/* Bottom */}
      {!hideMissionNames && (
        <div style={{ position: "absolute", bottom: 6, left: 6, right: 6 }}>
          <div style={{ background: MISSION_NAME_BG, borderRadius: 10, padding: "5px 7px 6px" }}>
            <p style={{ fontSize: 7.5, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.25, textAlign: "center" }}>{card.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pack Home Screen ─────────────────────────────────────────────────────────

function PackHomeScreen({ onSelectPack, achieved, isPremium, onShowPremium }: {
  onSelectPack: (id: string) => void;
  achieved: Set<number>;
  isPremium: boolean;
  onShowPremium: () => void;
}) {
  const packProgress = (pack: Pack) => {
    const packCards = CARDS.filter(c => c.packId === pack.id);
    return { done: packCards.filter(c => achieved.has(c.id)).length, total: packCards.length };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top signboard banner */}
      <div className="shrink-0 mx-4 mt-2 mb-0 rounded-lg overflow-hidden" style={{ border: `3px solid ${C.navy}` }}>
        {/* Red title band */}
        <div className="px-4 py-2 flex items-center justify-between" style={{ background: C.banner }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.5)" }}/>
            <span className="text-white font-black tracking-widest" style={{ fontSize: 9, fontFamily: "'Nunito', sans-serif" }}>TAIWAN MISSION</span>
            <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.5)" }}/>
          </div>
          <Map size={14} color="white"/>
        </div>
        {/* Cream body */}
        <div className="px-4 py-3" style={{ background: C.cream }}>
          <h1 className="font-black leading-tight" style={{ fontSize: 22, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", letterSpacing: "0.02em" }}>
            台湾ミッション図鑑
          </h1>
          <p style={{ fontSize: 10, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>ミッションセットを選んで旅に出よう</p>
        </div>
        {/* Tile strip */}
        <div className="flex h-2.5">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="flex-1" style={{ background: i % 2 === 0 ? C.navy : C.navyLight, borderRight: `0.5px solid rgba(255,255,255,0.08)` }}/>
          ))}
        </div>
      </div>

      {/* Mission set list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
        <p className="font-black" style={{ fontSize: 10, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", letterSpacing: "0.12em" }}>— ミッション一覧 —</p>
        {PACKS.map((pack, idx) => {
          const { done, total } = packProgress(pack);
          const pct = pack.available ? Math.round((done / total) * 100) : 0;
          const vol = `No.${String(idx + 1).padStart(2, "0")}`;
          const isLocked = pack.isProOnly && !isPremium;
          const clickable = pack.available;

          return (
            <motion.div key={pack.id}
              whileHover={clickable ? { scale: 1.02 } : {}}
              whileTap={clickable ? { scale: 0.98 } : {}}
              onClick={() => {
                if (!clickable) return;
                if (isLocked) {
                  onShowPremium(); // PRO未購入ならプレミアムモーダルを表示
                } else {
                  onSelectPack(pack.id);
                }
              }}
              className="rounded-xl overflow-hidden"
              style={{ border: `3px solid ${clickable ? C.navy : C.creamDark}`, cursor: clickable ? "pointer" : "default", boxShadow: clickable ? "0 4px 14px rgba(26,32,80,0.16)" : "0 2px 8px rgba(26,32,80,0.1)" }}
            >
              {/* Pack card inner */}
              <div className="flex" style={{ background: C.cream, minHeight: 110 }}>
                {/* Cover photo */}
                <div className="relative shrink-0" style={{ width: 110 }}>
                  <img src={pack.coverPhoto} alt={pack.name} className="absolute inset-0 w-full h-full object-cover"/>
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(26,32,80,0.0) 60%, rgba(242,227,191,0.8) 100%)" }}/>
                  {!pack.available ? (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(26,32,80,0.68)" }}>
                      <div style={{ textAlign: "center" }}>
                        <Lock size={22} color="white" style={{ margin: "0 auto 4px" }}/>
                        <span className="text-white font-black" style={{ fontSize: 8, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>近日公開</span>
                      </div>
                    </div>
                  ) : isLocked ? (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(26,32,80,0.68)" }}>
                      <div style={{ textAlign: "center" }}>
                        <Lock size={22} color="white" style={{ margin: "0 auto 4px" }}/>
                        <span className="text-white font-black" style={{ fontSize: 8, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>PRO限定</span>
                      </div>
                    </div>
                  ) : null}
                </div>
                {/* Info */}
                <div className="flex-1 px-3 py-3 flex flex-col justify-between">
                  <div>
                    {/* Pack name banner */}
                    <div className="inline-flex items-center px-2 py-0.5 mb-1.5" style={{ background: pack.accentColor, borderRadius: 3 }}>
                      <span className="text-white font-black" style={{ fontSize: 8, fontFamily: "'Nunito', sans-serif" }}>{vol}</span>
                    </div>
                    <p className="font-black leading-tight" style={{ fontSize: 15, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{pack.name}</p>
                    <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 2 }}>{pack.subtitle}</p>
                  </div>
                  {pack.available ? (
                    <div>
                      {/* Progress */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontSize: 8, color: C.tealDeep, fontFamily: "'Nunito', sans-serif" }}>進捗</span>
                          <span className="font-black" style={{ fontSize: 9, color: C.red, fontFamily: "'Nunito', sans-serif" }}>{done}/{total}</span>
                        </div>
                        <div className="rounded-full overflow-hidden transition-all duration-700" style={{
                          height: 6,
                          border: `1px solid ${C.navy}`,
                          background: `linear-gradient(90deg, ${C.red} 0%, ${C.gold} ${pct}%, rgba(26,32,80,0.12) ${pct}%, rgba(26,32,80,0.12) 100%)`,
                        }}/>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <span className="font-black flex items-center gap-1" style={{ fontSize: 9, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}><Lock size={9}/> もうすぐ追加予定...</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Bottom tab */}
              <div className="flex items-center justify-end px-3 py-1.5" style={{ background: C.navy }}>
                {pack.available && (
                  <span className="font-black" style={{ fontSize: 8, color: C.cream, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
                    {isLocked ? "🔒 タップしてPRO開放 →" : "タップして開く →"}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Future pack teaser */}
        <div className="rounded-xl py-4 flex flex-col items-center gap-1.5" style={{ border: `2px dashed ${C.navy}`, background: C.cream, boxShadow: "0 2px 8px rgba(26,32,80,0.1)" }}>
          <span style={{ fontSize: 20, color: C.red }}>✦</span>
          <span className="font-black" style={{ fontSize: 10, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>新ミッション続々追加予定！お楽しみに</span>
        </div>
      </div>
    </div>
  );
}

// ─── Pack Detail (card grid) ──────────────────────────────────────────────────

function PackDetailScreen({ pack, achieved, photos, onBack, onSelectCard, design }: {
  pack: Pack; achieved: Set<number>; photos: Record<number, string>;
  onBack: () => void; onSelectCard: (card: Card) => void;
  design: DesignSettings;
}) {
  const [activeFilter, setActiveFilter] = useState<Category | "すべて">("すべて");
  const packCards = CARDS.filter(c => c.packId === pack.id);
  const progress = packCards.filter(c => achieved.has(c.id)).length;
  const total = packCards.length;
  const filtered = activeFilter === "すべて" ? packCards : packCards.filter(c => c.category === activeFilter);
  // このパックに実在するカテゴリだけをフィルタ候補にする（1種類しかなければフィルタ行ごと隠す）
  const packCategories = CATEGORY_FILTERS.filter(cat => cat === "すべて" || packCards.some(c => c.category === cat));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mx-4 mt-2 mb-0 rounded-lg overflow-hidden" style={{ border: `3px solid ${C.navy}` }}>
        <div className="px-4 py-1.5 flex items-center justify-between" style={{ background: C.banner }}>
          <button onClick={onBack} className="flex items-center gap-1" style={{ background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "2px 8px" }}>
            <ChevronLeft size={13} color="white"/>
            <span className="text-white font-black" style={{ fontSize: 9, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>一覧へ</span>
          </button>
          <span className="text-white font-black tracking-widest" style={{ fontSize: 9, fontFamily: "'Nunito', sans-serif" }}>MISSION GUIDE</span>
        </div>
        <div className="px-4 py-2 flex items-center justify-between" style={{ background: C.cream }}>
          <div>
            <h1 className="font-black leading-tight" style={{ fontSize: 18, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{pack.name}</h1>
            <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{pack.subtitle}</p>
          </div>
          <div className="flex flex-col items-center justify-center" style={{ width: 48, height: 48, borderRadius: "50%", border: `2.5px solid ${C.red}`, background: C.white }}>
            <span className="font-black leading-none" style={{ fontSize: 14, color: C.red, fontFamily: "'Nunito', sans-serif" }}>{Math.round((progress / total) * 100)}</span>
            <span style={{ fontSize: 7, fontWeight: 700, color: C.red, fontFamily: "'Nunito', sans-serif" }}>%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 transition-all duration-500" style={{
          background: `linear-gradient(90deg, ${C.red} 0%, ${C.gold} ${(progress / total) * 100}%, rgba(26,32,80,0.12) ${(progress / total) * 100}%, rgba(26,32,80,0.12) 100%)`,
        }}/>
      </div>

      {/* Filters */}
      {packCategories.length > 2 && (
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {packCategories.map(cat => (
            <button key={cat} onClick={() => setActiveFilter(cat)}
              className="shrink-0 font-black transition-all duration-200"
              style={{ fontSize: 10, lineHeight: 1, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", padding: "5px 10px 4px", background: activeFilter === cat ? C.red : C.cream, color: activeFilter === cat ? "white" : C.navy, borderRadius: 4, border: `1.5px solid ${activeFilter === cat ? C.red : "rgba(26,32,80,0.25)"}` }}
            >{cat}</button>
          ))}
        </div>
      </div>
      )}

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-8 scrollbar-hide">
        <div className="grid grid-cols-3 gap-2.5">
          {filtered.map(card => (
            <motion.div key={card.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => onSelectCard(card)} className="cursor-pointer">
              <StickerCard card={card} unlocked={achieved.has(card.id)} photoUrl={photos[card.id]} hideMissionNames={design.hideMissionNames}/>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Photo Upload Modal ───────────────────────────────────────────────────────

function PhotoUploadModal({ card, onConfirm, onSkip, onClose }: {
  card: Card;
  onConfirm: (url: string | null, memo: string) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) photoFileToDataUrl(f).then(setSel).catch(error => console.warn("Photo could not be loaded.", error));
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-end justify-center"
      style={{ background: "rgba(26,32,80,0.75)" }}
      onClick={onClose} /* 背景タップでキャンセルして閉じる */
    >
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} className="w-full max-w-md flex flex-col"
        style={{ background: C.cream, borderRadius: "20px 20px 0 0", border: `3px solid ${C.navy}`, borderBottom: "none", maxHeight: "88dvh" }}
        onClick={e => e.stopPropagation()} /* ダイアログ内のタップが親の背景タップに伝播するのを防ぐ */
      >
        <div className="flex items-center justify-center py-3 shrink-0" style={{ background: C.red, borderRadius: "17px 17px 0 0", borderBottom: `2.5px solid ${C.navy}` }}>
          <Camera size={15} color="white" style={{ marginRight: 8 }}/>
          <span className="text-white font-black text-sm" style={{ fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>思い出を記録しよう</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
          <p className="text-center text-xs" style={{ color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{card.name}の思い出を残そう（すべて任意）</p>
          {/* Photo picker */}
          {sel ? (
            <div className="space-y-1.5">
              <div className="relative mx-auto rounded overflow-hidden" style={{ width: "min(40vw, 150px)", aspectRatio: "3/4", border: `2px solid ${C.navy}` }}>
                <img src={sel} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "center center" }}/>
              </div>
              <button onClick={() => ref.current?.click()} className="w-full text-center text-xs py-1" style={{ color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>写真を変更する</button>
            </div>
          ) : (
            <button onClick={() => ref.current?.click()} className="w-full py-4 rounded flex items-center justify-center gap-3" style={{ background: "rgba(26,32,80,0.05)", border: `2px dashed rgba(26,32,80,0.22)` }}>
              <Upload size={18} color={C.tealDeep}/>
              <span style={{ fontSize: 12, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", fontWeight: 700 }}>写真を追加する（任意）</span>
            </button>
          )}
          <input ref={ref} type="file" accept="image/*" onChange={onChange} className="hidden"/>
          {/* Memo */}
          <div style={{ border: `2px solid ${C.navy}`, borderRadius: 8, overflow: "hidden" }}>
            <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: C.navy }}>
              <Lightbulb size={12} color="white"/>
              <span className="text-white font-black" style={{ fontSize: 10, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>旅のひとことメモ</span>
            </div>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="食べたもの、感想、一緒に行った人のこと…なんでも！"
              rows={3}
              className="w-full resize-none outline-none"
              style={{ background: C.white, padding: "10px 12px", fontSize: 12, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.6 }}
            />
          </div>
        </div>
        <div className="px-6 pt-2 space-y-3 shrink-0" style={{ borderTop: `1.5px solid ${C.navy}`, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onConfirm(sel, memo)}
            className="w-full py-3.5 font-black text-sm text-white flex items-center justify-center gap-2"
            style={{ background: C.red, borderRadius: 6, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}
          ><CheckCircle2 size={14}/> 達成！記録する</motion.button>
          
          <div className="flex gap-2 w-full">
            <button onClick={onSkip} className="flex-1 py-2.5 text-center font-black text-xs" style={{ background: "rgba(26,32,80,0.05)", border: `2px solid ${C.navy}`, borderRadius: 6, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
              写真なしで達成
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 text-center font-black text-xs" style={{ background: "rgba(26,32,80,0.05)", border: `2px solid rgba(26,32,80,0.3)`, borderRadius: 6, color: "rgba(26,32,80,0.6)", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
              キャンセルして戻る
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Card Detail ──────────────────────────────────────────────────────────────

function CardDetail({ card, unlocked, photoUrl, memo, onClose, onAchieve, onPhotoUpload, onMemoSave }: {
  card: Card; unlocked: boolean; photoUrl?: string; memo?: string;
  onClose: () => void; onAchieve: () => void;
  onPhotoUpload: (id: number, url: string) => void;
  onMemoSave: (id: number, text: string) => void;
}) {
  const [selPhoto, setSelPhoto] = useState<string | null>(photoUrl || null);
  const [memoText, setMemoText] = useState(memo || "");
  const [editingMemo, setEditingMemo] = useState(false);
  const [sharing, setSharing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const display = selPhoto || card.cardPhoto;

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareAchievedCard(card, selPhoto || photoUrl);
    } catch (error) {
      // ユーザーがシェアシートを閉じた場合もここに来るため、静かに無視する
      console.warn("Share was cancelled or failed.", error);
    } finally {
      setSharing(false);
    }
  };

  const resetViewportAfterKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }, 120);
  };

  const closeMemoEditor = (nextMemo?: string) => {
    if (nextMemo !== undefined) onMemoSave(card.id, nextMemo);
    setEditingMemo(false);
    resetViewportAfterKeyboard();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) photoFileToDataUrl(f).then(setSelPhoto).catch(error => console.warn("Photo could not be loaded.", error));
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="absolute inset-0 z-40 flex flex-col overflow-hidden"
      style={{ background: C.cream, isolation: "isolate" }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: APP_BG, backgroundSize: "cover", backgroundPosition: "center", zIndex: 0, pointerEvents: "none" }}/>
      {/* Header */}
      <div className="relative shrink-0" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)", background: C.navy, borderBottom: `3px solid ${C.red}`, zIndex: 2 }}>
        <div className="flex items-center justify-between gap-3 px-4 pb-2">
          <button onClick={onClose} className="flex items-center gap-1 px-3 py-2" style={{ background: C.red, borderRadius: 6, border: `1.5px solid ${C.redDark}` }}>
            <ChevronLeft size={14} color="white"/>
            <span className="text-white font-black" style={{ fontSize: 12, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>もどる</span>
          </button>
          <span className="font-black tracking-widest" style={{ fontSize: 9, color: C.cream, fontFamily: "'Nunito', sans-serif" }}>MISSION DETAIL</span>
          <div style={centeredBadgeBox("auto", 38, { background: MISSION_NAME_BG, borderRadius: 6, border: `1.5px solid ${C.tealDeep}` })}>
            <BadgeText fontSize={10} color={C.tealDeep}>{card.category}</BadgeText>
          </div>
        </div>
      </div>

      {/* Hero photo */}
      <div className="relative shrink-0" style={{ height: 218, zIndex: 1 }}>
        <img src={display} alt={card.name} className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-0" style={{ background: unlocked
          ? "linear-gradient(to top, rgba(26,32,80,0.88) 0%, rgba(26,32,80,0.2) 55%, rgba(26,32,80,0.0) 100%)"
          : "linear-gradient(to top, rgba(26,32,80,0.82) 0%, rgba(26,32,80,0.1) 48%, rgba(26,32,80,0.0) 100%)"
        }}/>
        {/* Bottom info on hero */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-white font-black drop-shadow-lg" style={{ fontSize: 20, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{card.name}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{card.catchphrase}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {unlocked
                ? <div className="px-2 py-1 flex items-center gap-1" style={{ background: C.red, borderRadius: 3 }}><CheckCircle2 size={10} color="white"/><span className="text-white font-black" style={{ fontSize: 9, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>達成済み</span></div>
                : <div style={centeredBadgeBox("auto", 42, { border: `2px solid ${C.red}`, borderRadius: 6, background: MISSION_NAME_BG, padding: "0 12px" })}><BadgeText fontSize={9} color={C.red}>未達成</BadgeText></div>
              }
              {unlocked && (
                <button onClick={() => ref.current?.click()} className="flex items-center gap-1 px-2 py-1" style={{ background: C.tealDeep, borderRadius: 3 }}>
                  <Camera size={10} color="white"/>
                  <span className="text-white" style={{ fontSize: 9, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{photoUrl ? "写真変更" : "写真追加"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tile divider */}
      <div className="relative shrink-0 flex" style={{ height: 12, zIndex: 1 }}>
        {[...Array(20)].map((_, i) => <div key={i} className="flex-1" style={{ background: i % 2 === 0 ? C.navy : C.navyLight, borderRight: "0.5px solid rgba(255,255,255,0.06)" }}/>)}
      </div>

      {/* Info — cream bg */}
      <div className="relative flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide" style={{ background: C.cream, zIndex: 1 }}>
        <p className="text-sm leading-relaxed" style={{ color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{card.description}</p>
        <div style={{ border: `2.5px solid ${C.navy}`, borderRadius: 6, overflow: "hidden" }}>
          <div className="px-3 py-1.5" style={{ background: C.navy }}>
            <span className="text-white font-black tracking-wider" style={{ fontSize: 10, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>ミッション情報</span>
          </div>
          {[
            { icon: <CheckCircle2 size={14} color={C.red}/>, label: "達成条件", val: card.condition },
            { icon: <MapPin size={14} color={C.red}/>, label: "おすすめエリア", val: card.area },
            { icon: <Lightbulb size={14} color={C.red}/>, label: "豆知識", val: card.trivia },
          ].map((row, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3" style={{ background: i % 2 === 0 ? C.white : C.cream, borderTop: i > 0 ? `1px solid ${C.creamDark}` : "none" }}>
              <div className="mt-0.5 shrink-0">{row.icon}</div>
              <div>
                <p className="font-bold tracking-wider mb-0.5 uppercase" style={{ fontSize: 8.5, color: C.tealDeep, fontFamily: "'Nunito', sans-serif" }}>{row.label}</p>
                <p className="text-sm" style={{ color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{row.val}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Memo section */}
        {unlocked && (
          <div style={{ border: `2.5px solid ${C.navy}`, borderRadius: 6, overflow: "hidden" }}>
            <div className="px-3 py-1.5 flex items-center justify-between" style={{ background: C.navy }}>
              <div className="flex items-center gap-2">
                <Lightbulb size={13} color="white"/>
                <span className="text-white font-black" style={{ fontSize: 10, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>旅のメモ</span>
              </div>
              {!editingMemo && (
                <button onClick={() => setEditingMemo(true)} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "2px 8px" }}>
                  <span className="text-white font-black" style={{ fontSize: 9, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{memoText ? "編集" : "＋ 追加"}</span>
                </button>
              )}
            </div>
            {editingMemo ? (
              <div style={{ background: C.white }}>
                <textarea
                  autoFocus
                  value={memoText}
                  onChange={e => setMemoText(e.target.value)}
                  placeholder="食べた感想、誰と行ったか、天気、値段…なんでも！"
                  rows={4}
                  className="w-full resize-none outline-none"
                  style={{ padding: "12px 14px", fontSize: 16, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.7, background: C.white }}
                />
                <div className="flex gap-2 px-3 pb-3">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => closeMemoEditor(memoText)}
                    className="flex-1 py-2 font-black text-white text-center"
                    style={{ background: C.red, borderRadius: 5, fontSize: 12, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}
                  >保存する</motion.button>
                  <button onClick={() => { setMemoText(memo || ""); closeMemoEditor(); }}
                    className="px-4 py-2 font-black text-center"
                    style={{ background: C.creamDark, borderRadius: 5, fontSize: 12, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}
                  >キャンセル</button>
                </div>
              </div>
            ) : memoText ? (
              <div style={{ padding: "12px 14px", background: C.white }}>
                <p style={{ fontSize: 13, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{memoText}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-5" style={{ background: C.white }}>
                <p style={{ fontSize: 12, color: "rgba(26,32,80,0.35)", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>メモはまだありません</p>
              </div>
            )}
          </div>
        )}
        {unlocked && selPhoto && selPhoto !== photoUrl && (
          <div style={{ border: `2px solid ${C.red}`, borderRadius: 6, overflow: "hidden" }}>
            <div className="px-3 py-1" style={{ background: C.red }}><span className="text-white font-black" style={{ fontSize: 10, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>新しい写真が選択されています</span></div>
            <div className="relative mx-auto my-3" style={{ width: "min(56vw, 170px)", aspectRatio: "3/4" }}>
              <img src={selPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "center center" }}/>
            </div>
          </div>
        )}
      </div>

      <input ref={ref} type="file" accept="image/*" onChange={onChange} className="hidden"/>

      <div className="relative shrink-0 px-5 pt-3" style={{ background: C.cream, borderTop: `2.5px solid ${C.navy}`, zIndex: 1, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        {unlocked ? (
          <div className="space-y-2">
            {selPhoto && selPhoto !== photoUrl
              ? <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (selPhoto) onPhotoUpload(card.id, selPhoto); }} className="w-full py-3.5 font-black text-sm text-white flex items-center justify-center gap-2" style={{ background: C.red, borderRadius: 6, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}><Camera size={14}/> 写真を保存する</motion.button>
              : <div className="w-full py-3.5 text-center font-black text-sm flex items-center justify-center gap-2" style={{ background: C.white, color: C.tealDeep, border: `2px solid ${C.navy}`, borderRadius: 6, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}><BadgeCheck size={14}/> 達成済みです！</div>}
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleShare}
              className="w-full py-3.5 font-black text-sm text-white flex items-center justify-center gap-2"
              style={{ background: C.navy, borderRadius: 6, opacity: sharing ? 0.6 : 1, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
              <Share2 size={14}/> {sharing ? "画像を作成中…" : "思い出をシェアする"}
            </motion.button>
          </div>
        ) : (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onAchieve} className="w-full py-3.5 font-black text-sm text-white flex items-center justify-center gap-2" style={{ background: C.red, borderRadius: 6, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}><CheckCircle2 size={14}/> ミッション達成！</motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Achievement Celebration ──────────────────────────────────────────────────

function AchievedCelebration({ card, photoUrl, onClose }: { card: Card; photoUrl?: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3400); return () => clearTimeout(t); }, [onClose]);
  const display = photoUrl || card.cardPhoto;
  const stickerPng = STICKER_PNG[card.id];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center"
      style={{ background: `rgba(26,32,80,0.96)` }} onClick={onClose}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="300" height="300" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="135" fill="none" stroke={C.gold} strokeWidth="1.5" strokeDasharray="6 5" opacity="0.35"/>
          <circle cx="150" cy="150" r="108" fill="none" stroke={C.red} strokeWidth="0.8" opacity="0.2"/>
        </svg>
      </div>
      <motion.div initial={{ scale: 0.3, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }} className="text-center"
      >
        <div className="relative mx-auto mb-5 overflow-hidden" style={{
          width: 164,
          aspectRatio: "1/1",
          borderRadius: 20,
          background: C.cream,
          boxShadow: "0 0 40px rgba(242,199,55,0.34), 0 0 80px rgba(242,199,55,0.18)",
          border: `3px solid ${C.navy}`,
        }}>
          {stickerPng ? (
            <img src={stickerPng} alt={card.name} className="absolute" style={{ inset: 12, width: "calc(100% - 24px)", height: "calc(100% - 24px)", objectFit: "contain" }}/>
          ) : (
            <>
              <img src={display} alt={card.name} className="absolute inset-0 w-full h-full object-cover"/>
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26,32,80,0.82) 0%, transparent 55%)" }}/>
            </>
          )}
          <div className="absolute bottom-2 left-2 right-2 px-1.5 py-1.5 text-center rounded" style={{ background: MISSION_NAME_BG, border: `1.5px solid ${C.navy}` }}>
            <p style={{ fontSize: 9, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{card.name}</p>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="inline-block px-6 py-1 mb-1.5" style={{ background: C.red, borderRadius: 4 }}>
            <p className="text-white font-black" style={{ fontSize: 20, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>カード獲得！</p>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 4 }}>図鑑に追加されました</p>
        </motion.div>
      </motion.div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 40 }}>タップで閉じる</p>
    </motion.div>
  );
}

// ─── Sticker Notebook ────────────────────────────────────────────────────────

interface StickerPos { x: number; y: number; rotate: number; scale: number }

/* Real sticker look — uses transparent-bg PNG when available, else circular photo cutout */
function NoteSticker({ card, photoUrl }: { card: Card; photoUrl?: string }) {
  const stickerPng = STICKER_PNG[card.id];

  if (stickerPng) {
    return <img src={stickerPng} alt={card.name} style={{ width: 90, height: 90, objectFit: "contain", display: "block" }}/>;
  }

  const photo = photoUrl || card.cardPhoto;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {/* Circle sticker body */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%", overflow: "hidden", position: "relative",
        border: `5px solid white`,
        boxShadow: `0 0 0 2.5px ${C.tealDeep}, 0 6px 18px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.22)`,
      }}>
        <img src={photo} alt={card.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.28) 100%)" }}/>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", paddingBottom: 6, paddingTop: 14, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)" }}>
          <span style={{ fontSize: 7, color: "white", fontWeight: 900, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1 }}>達成</span>
        </div>
      </div>
    </div>
  );
}

function DraggableSticker({ card, initX, initY, initRotate, initScale, onMove, photoUrl, isNew = false, onNewSeen }: {
  card: Card; initX: number; initY: number; initRotate: number; initScale: number;
  onMove: (id: number, x: number, y: number, rotate: number, scale: number) => void;
  photoUrl?: string;
  isNew?: boolean;
  onNewSeen?: () => void;
}) {
  const x = useMotionValue(initX);
  const y = useMotionValue(initY);
  const rotate = useMotionValue(initRotate);
  const scale = useMotionValue(initScale);
  const pinch = useRef<{ dist: number; angle: number } | null>(null);

  type TouchPoint = { clientX: number; clientY: number };
  const getDist = (a: TouchPoint, b: TouchPoint) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  const getAngle = (a: TouchPoint, b: TouchPoint) => Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI;

  const onTouchStart = (e: React.TouchEvent) => {
    if (isNew) onNewSeen?.();
    if (e.touches.length === 2) {
      e.stopPropagation();
      pinch.current = { dist: getDist(e.touches[0], e.touches[1]), angle: getAngle(e.touches[0], e.touches[1]) };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      e.stopPropagation();
      const newDist = getDist(e.touches[0], e.touches[1]);
      const newAngle = getAngle(e.touches[0], e.touches[1]);
      scale.set(Math.max(0.3, Math.min(5, scale.get() * newDist / pinch.current.dist)));
      rotate.set(rotate.get() + newAngle - pinch.current.angle);
      pinch.current = { dist: newDist, angle: newAngle };
    }
  };
  const save = () => onMove(card.id, x.get(), y.get(), rotate.get(), scale.get());

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isNew) onNewSeen?.();
    if (e.shiftKey) {
      rotate.set(rotate.get() + e.deltaY * 0.3);
    } else {
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      scale.set(Math.max(0.3, Math.min(5, scale.get() * factor)));
    }
    save();
  };

  return (
    <motion.div
      drag dragMomentum={false} dragElastic={0}
      style={{ x, y, rotate, scale, position: "absolute", top: 0, left: 0, width: 90, touchAction: "none", cursor: "grab", zIndex: 10 }}
      whileTap={{ zIndex: 60 }}
      onPointerDown={() => { if (isNew) onNewSeen?.(); }}
      onDragEnd={save}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={save}
      onWheel={onWheel}
    >
      {isNew && (
        <motion.div
          initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: -8, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 280 }}
          style={{
            position: "absolute",
            top: -10,
            right: -18,
            zIndex: 3,
            ...centeredBadgeBox(42, 22, {
              borderRadius: 999,
              background: C.red,
              border: `2px solid ${C.cream}`,
              boxShadow: "0 4px 10px rgba(0,0,0,0.22)",
              pointerEvents: "none",
            }),
          }}
        >
          <BadgeText fontSize={8} color="white">NEW</BadgeText>
        </motion.div>
      )}
      <NoteSticker card={card} photoUrl={photoUrl}/>
    </motion.div>
  );
}

function NotebookScreen({ achieved, photos, stickerPositions, newStickerId, onClearNewSticker, onUpdatePosition }: {
  achieved: Set<number>; photos: Record<number, string>;
  stickerPositions: Record<number, StickerPos>;
  newStickerId: number | null;
  onClearNewSticker: () => void;
  onUpdatePosition: (id: number, x: number, y: number, rotate: number, scale: number) => void;
}) {
  const achievedCards = CARDS.filter(c => achieved.has(c.id));
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mx-4 mt-2 mb-2 rounded-xl overflow-hidden" style={{ border: `3px solid ${C.navy}` }}>
        <div className="px-4 py-1.5 flex items-center justify-between" style={{ background: C.banner }}>
          <span className="text-white font-black tracking-widest" style={{ fontSize: 9, fontFamily: "'Nunito', sans-serif" }}>MY STICKER BOOK</span>
          <BookOpen size={13} color="white"/>
        </div>
        <div className="px-4 py-2 flex items-center justify-between" style={{ background: C.cream }}>
          <div>
            <h1 className="font-black leading-tight" style={{ fontSize: 17, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>シールノート</h1>
            <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>ドラッグして好きな場所に貼ろう</p>
          </div>
          <div className="text-right">
            <span className="font-black" style={{ fontSize: 22, color: C.red, fontFamily: "'Nunito', sans-serif", lineHeight: 1 }}>{achievedCards.length}</span>
            <span style={{ fontSize: 10, color: C.tealDeep, fontFamily: "'Nunito', sans-serif" }}>/{CARDS.length}</span>
            <p style={{ fontSize: 8, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>枚ゲット</p>
          </div>
        </div>
      </div>

      {/* Notebook canvas */}
      <div className="flex-1 overflow-auto mx-4 mb-2 rounded-xl relative scrollbar-hide"
        style={{ border: `3px solid ${C.navy}`, background: C.notePaper,
          backgroundImage: "linear-gradient(rgba(100,80,40,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,40,0.1) 1px, transparent 1px)",
          backgroundSize: "24px 24px" }}
      >

        {/* Sticker placement area */}
        <div style={{ position: "relative", height: 1600, width: "100%" }}>
          {achievedCards.length === 0 ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 60 }}>
              <BookOpen size={44} color={C.mutedInk}/>
              <p style={{ fontSize: 12, color: C.mutedInk, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", textAlign: "center", lineHeight: 1.8 }}>
                ミッションを達成すると<br/>ここにシールが登場！
              </p>
            </div>
          ) : (
            achievedCards.map(card => {
              const pos = stickerPositions[card.id] ?? { x: 50, y: 50, rotate: 0, scale: 1 };
              return (
                <DraggableSticker key={card.id} card={card}
                  initX={pos.x} initY={pos.y} initRotate={pos.rotate} initScale={pos.scale ?? 1}
                  photoUrl={photos[card.id]}
                  isNew={newStickerId === card.id}
                  onNewSeen={onClearNewSticker}
                  onMove={onUpdatePosition}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center" style={{
      width: "100vw",
      height: "100dvh",
      minHeight: "100vh",
      background: C.cream,
    }}>
      <div className="absolute inset-0" style={{ backgroundImage: APP_BG, backgroundSize: "cover", backgroundPosition: "center" }}/>
      <div className="relative flex flex-col items-center gap-6 px-4 w-full">
        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.55, ease: "backOut" }}
          style={{
            width: "100%",
            maxWidth: 360,
            textAlign: "center",
          }}>
          <img src={brandTitle} alt="台湾ミッション図鑑" style={{ width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 10px 0 rgba(26,32,80,0.22)) drop-shadow(0 18px 22px rgba(26,32,80,0.16))" }}/>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, border: `1px solid ${C.navy}` }}
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}/>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─── shared app shell ─────────────────────────────────────────────────────────
const APP_BG = `url("${travelBackground}")`;
function AppShell({ children, background = C.cream }: { children: React.ReactNode; background?: string }) {
  return (
    <div className="relative overflow-hidden flex flex-col" style={{
      width: "100vw",
      height: "100dvh",
      minHeight: "100vh",
      background,
      boxSizing: "border-box",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      <div className="absolute inset-0" style={{ backgroundImage: APP_BG, backgroundSize: "cover", backgroundPosition: "center" }}/>
      {children}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

type AuthProvider = "apple" | "google" | "email" | "guest";

function hasPremiumEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]);
}

function pickLifetimePackage(packages: PurchasesPackage[]) {
  const target = REVENUECAT_PRODUCT_ID.toLowerCase();
  return packages.find(pkg => pkg.product.identifier.toLowerCase() === target);
}

function LoginScreen({
  onLogin,
  onEmailAuth,
  onOAuth,
}: {
  onLogin: (provider: AuthProvider) => void;
  onEmailAuth: (email: string, password: string, mode: "login" | "signup") => Promise<void>;
  onOAuth: (provider: "apple" | "google") => Promise<void>;
}) {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState<AuthProvider | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [legalScreen, setLegalScreen] = useState<"privacy" | "terms" | null>(null);

  const withLoginTimeout = async <T,>(task: Promise<T>) => {
    let timer: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => {
        reject(new Error("ログインの応答がありませんでした。通信状態かFirebase設定を確認してください。"));
      }, 12000);
    });
    try {
      return await Promise.race([task, timeout]);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  };

  if (legalScreen === "privacy") return (
    <AppShell background={C.cream}>
      <PrivacyScreen onBack={() => setLegalScreen(null)}/>
    </AppShell>
  );
  if (legalScreen === "terms") return (
    <AppShell background={C.cream}>
      <TermsScreen onBack={() => setLegalScreen(null)}/>
    </AppShell>
  );

  const handleProvider = async (p: AuthProvider) => {
    setAuthError(null);
    if (p === "email") { setShowEmail(true); return; }
    if (p === "apple" || p === "google") {
      setLoading(p);
      try {
        await withLoginTimeout(onOAuth(p));
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "ログインに失敗しました。もう一度お試しください。");
      } finally {
        setLoading(null);
      }
      return;
    }
    setLoading(p);
    setTimeout(() => { setLoading(null); onLogin(p); }, 900);
  };

  const handleEmailSubmit = async () => {
    if (!email || !password) return;
    setAuthError(null);
    setLoading("email");
    try {
      await withLoginTimeout(onEmailAuth(email.trim(), password, emailMode));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto flex flex-col justify-center py-6 scrollbar-hide">
        {/* Hero */}
        <div className="relative flex flex-col items-center pt-2 pb-5 px-5 shrink-0">
          <motion.div initial={{ scale: 0.92, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "backOut" }}
            style={{ width: "100%", maxWidth: 300 }}>
            <img src={brandTitle} alt="台湾ミッション図鑑" style={{ width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 8px 0 rgba(26,32,80,0.2)) drop-shadow(0 14px 18px rgba(26,32,80,0.14))" }}/>
          </motion.div>
        </div>

        {/* Auth card */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="relative mx-5 rounded-2xl overflow-hidden flex flex-col shrink-0"
          style={{ background: C.cream, border: `3px solid ${C.navy}`, maxWidth: 440, width: "calc(100% - 40px)", alignSelf: "center" }}>

          {!showEmail ? (
            <div className="p-5 flex flex-col gap-3">
              <p className="text-center font-black" style={{ fontSize: 11, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginBottom: 2 }}>ログイン / 新規登録</p>

              {/* Apple */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleProvider("apple")}
                className="w-full py-3.5 flex items-center justify-center gap-3 font-black relative"
                style={{ background: "#000", borderRadius: 10, border: `2px solid ${C.navy}`, fontSize: 13, color: "white", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
                {loading === "apple" ? <Spinner/> : <><AppleIcon size={18}/> Appleでログイン</>}
              </motion.button>

              {/* Google */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleProvider("google")}
                className="w-full py-3.5 flex items-center justify-center gap-3 font-black"
                style={{ background: C.white, borderRadius: 10, border: `2px solid ${C.navy}`, fontSize: 13, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
                {loading === "google" ? <Spinner dark/> : <><GoogleIcon size={18}/> Googleでログイン</>}
              </motion.button>

              {/* Email */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleProvider("email")}
                className="w-full py-3.5 flex items-center justify-center gap-3 font-black"
                style={{ background: C.red, borderRadius: 10, border: `2px solid ${C.navy}`, fontSize: 13, color: "white", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
                <Mail size={16}/> メールアドレスでログイン
              </motion.button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: "rgba(26,32,80,0.15)" }}/>
                <span style={{ fontSize: 9, color: "rgba(26,32,80,0.4)", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>またはゲストで試す</span>
                <div className="flex-1 h-px" style={{ background: "rgba(26,32,80,0.15)" }}/>
              </div>

              <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleProvider("guest")}
                className="w-full py-3 flex items-center justify-center gap-2 font-black"
                style={{ background: C.creamDark, borderRadius: 10, border: `2px solid rgba(26,32,80,0.18)`, fontSize: 12, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
                {loading === "guest" ? <Spinner dark/> : "ゲストとして始める"}
              </motion.button>
              {authError && <p style={{ fontSize: 10, color: C.red, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.6, textAlign: "center" }}>{authError}</p>}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex" style={{ borderBottom: `2.5px solid ${C.navy}` }}>
                <button onClick={() => setShowEmail(false)} style={{ padding: "10px 14px", background: "transparent" }}>
                  <ChevronLeft size={18} color={C.navy}/>
                </button>
                {(["login", "signup"] as const).map(t => (
                  <button key={t} onClick={() => setEmailMode(t)} className="flex-1 py-3 font-black transition-all"
                    style={{ fontSize: 11, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", background: emailMode === t ? C.red : C.creamDark, color: emailMode === t ? "white" : C.navy }}>
                    {t === "login" ? "ログイン" : "新規登録"}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 p-5">
                <div>
                  <p style={{ fontSize: 10, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginBottom: 5 }}>メールアドレス</p>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="taiwan@example.com" type="email" className="w-full outline-none"
                    style={{ background: C.white, border: `2px solid ${C.navy}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}/>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginBottom: 5 }}>パスワード</p>
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" className="w-full outline-none"
                    style={{ background: C.white, border: `2px solid ${C.navy}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}/>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleEmailSubmit}
                  className="w-full py-3.5 font-black text-white flex items-center justify-center gap-2"
                  style={{ background: C.red, borderRadius: 10, border: `2.5px solid ${C.navy}`, fontSize: 13, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 2 }}>
                  {loading === "email" ? <Spinner/> : (emailMode === "login" ? "ログインする" : "登録して始める")}
                </motion.button>
                {authError && <p style={{ fontSize: 10, color: C.red, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.6, textAlign: "center" }}>{authError}</p>}
              </div>
            </div>
          )}

          {/* Legal links */}
          <div className="flex justify-center gap-4 pb-4">
            <button onClick={() => setLegalScreen("privacy")} style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>プライバシーポリシー</button>
            <button onClick={() => setLegalScreen("terms")} style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>利用規約</button>
          </div>
        </motion.div>

        <p className="relative text-center py-4 shrink-0" style={{ fontSize: 9, color: "rgba(253,250,243,0.35)", fontFamily: "'Nunito', sans-serif" }}>
          ログイン後、写真・ミッションデータがクラウドに保存されます
        </p>
      </div>
    </AppShell>
  );
}

function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function Spinner({ dark }: { dark?: boolean }) {
  return <motion.div style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid ${dark ? C.navy : "white"}`, borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}/>;
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

type SubScreen = "privacy" | "terms" | "support" | "contact" | null;

function LegalScreen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 relative" style={{ background: C.navy, borderBottom: `2px solid ${C.red}` }}>
        <button onClick={onBack} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.12)", borderRadius: "50%", border: "none" }}>
          <ChevronLeft size={16} color="white"/>
        </button>
        <h2 className="font-black text-white" style={{ fontSize: 14, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", letterSpacing: "0.05em" }}>{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4" style={{ background: C.cream }}>
        {children}
      </div>
    </div>
  );
}

const LEGAL_STYLE = {
  h2: { fontSize: 12, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 16, marginBottom: 4, borderLeft: `3px solid ${C.red}`, paddingLeft: 8 } as React.CSSProperties,
  p: { fontSize: 10, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.85, marginBottom: 8 } as React.CSSProperties,
  small: { fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.7, marginBottom: 6 } as React.CSSProperties,
};

function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <LegalScreen title="プライバシーポリシー" onBack={onBack}>
      <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginBottom: 12 }}>最終更新日: 2026年5月</p>
      <p style={LEGAL_STYLE.p}>台湾ミッション図鑑（以下「本アプリ」）をご利用いただきありがとうございます。本ポリシーは、お客様の個人情報の取り扱いについて説明するものです。</p>

      <p style={LEGAL_STYLE.h2}>1. 取り扱う情報</p>
      <p style={LEGAL_STYLE.p}>本アプリでは、お客様のデータを安全に保管・同期するために、以下の情報を取り扱います：</p>
      <p style={LEGAL_STYLE.small}>• アカウント情報（Apple ID／Google アカウント／メールアドレス）{"\n"}• ユーザーが作成したコンテンツ（写真・メモ・達成済みミッション）{"\n"}• プレミアム購入の状態</p>
      <p style={LEGAL_STYLE.p}>※本アプリは、お客様の現在地情報を収集・取得しません。</p>

      <p style={LEGAL_STYLE.h2}>2. 情報の利用目的とセキュリティ</p>
      <p style={LEGAL_STYLE.small}>• アカウントの管理および安全な本人認証{"\n"}• クラウドバックアップと複数端末間でのリアルタイム同期{"\n"}• アプリの動作改善および不具合の修正{"\n"}• カスタマーサポートの提供{"\n"}• プレミアムプランの管理</p>
      <p style={LEGAL_STYLE.p}>【安心してお使いいただくために】{"\n"}お客様が登録・撮影した写真やメモは、ご自身の端末や機種変更時の「自動バックアップ・同期」のみを目的に使用され、高度に暗号化された安全なクラウドサーバー（Firebase）に保管されます。開発者を含む第三者が、これらのお客様の写真を無断で閲覧、公開、または二次利用することは一切ありませんので安心してご利用ください。</p>

      <p style={LEGAL_STYLE.h2}>3. 第三者への提供</p>
      <p style={LEGAL_STYLE.p}>お客様の写真・メモ等のデータを、広告目的で第三者に販売・提供することは一切ありません。本アプリが安全なデータ保管やサービス提供のために利用する信頼された外部サービスは以下のとおりです：</p>
      <p style={LEGAL_STYLE.small}>• Firebase（Google LLC）：認証・データ保管・バックアップ写真の暗号化保存{"\n"}• RevenueCat：プレミアム購入状態の管理{"\n"}• Apple App Store：アプリ内課金の安全な処理</p>

      <p style={LEGAL_STYLE.h2}>4. データの保管と削除</p>
      <p style={LEGAL_STYLE.p}>設定画面からアカウントを削除することで、サーバー（Firebase）上に保管されているお客様のアカウント情報・写真・メモ・達成データを即座にすべて完全消去できます。なお、アプリ内購入の履歴はAppleが管理します。</p>

      <p style={LEGAL_STYLE.h2}>5. お子様のプライバシー</p>
      <p style={LEGAL_STYLE.p}>本アプリは13歳未満のお子様を対象としておらず、意図的に個人情報を収集しません。</p>

      <p style={LEGAL_STYLE.h2}>6. お問い合わせ</p>
      <p style={LEGAL_STYLE.p}>プライバシーに関するご質問や懸念は、アプリ内のお問い合わせフォームからいつでもご連絡ください。</p>
    </LegalScreen>
  );
}

function TermsScreen({ onBack }: { onBack: () => void }) {
  return (
    <LegalScreen title="利用規約" onBack={onBack}>
      <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginBottom: 12 }}>最終更新日: 2025年1月</p>
      <p style={LEGAL_STYLE.p}>本規約は、台湾ミッション図鑑（以下「本アプリ」）のご利用条件を定めるものです。ご利用前に必ずお読みください。</p>

      <p style={LEGAL_STYLE.h2}>1. 利用条件</p>
      <p style={LEGAL_STYLE.p}>本アプリを利用することで、本規約に同意したものとみなします。13歳未満の方は保護者の同意が必要です。</p>

      <p style={LEGAL_STYLE.h2}>2. 禁止事項</p>
      <p style={LEGAL_STYLE.small}>• 他者のコンテンツを無断でアップロードする行為{"\n"}• 著作権侵害・プライバシー侵害にあたる行為{"\n"}• アプリの改ざん・リバースエンジニアリング{"\n"}• 不正な方法でプレミアム機能を利用する行為</p>

      <p style={LEGAL_STYLE.h2}>3. 情報の正確性</p>
      <p style={LEGAL_STYLE.p}>本アプリに掲載している店舗の営業時間・価格・メニュー情報は、最新かつ正確であることを保証するものではありません。ご利用の際は各店舗にご確認ください。</p>

      <p style={LEGAL_STYLE.h2}>4. 免責事項</p>
      <p style={LEGAL_STYLE.p}>本アプリの利用中に発生した事故・怪我・損害については、故意または重大な過失がある場合を除き、責任を負いかねます。</p>

      <p style={LEGAL_STYLE.h2}>5. プレミアムプランについて</p>
      <p style={LEGAL_STYLE.p}>プレミアムプランは¥600の買い切り購入です。サブスクリプションではなく、自動更新は発生しません。一度購入した場合、払い戻しはAppleの規約に従います。</p>

      <p style={LEGAL_STYLE.h2}>6. 規約の変更</p>
      <p style={LEGAL_STYLE.p}>本規約は予告なく変更される場合があります。変更後もアプリを利用し続けることで、新しい規約に同意したものとみなします。</p>

      <p style={LEGAL_STYLE.h2}>7. お問い合わせ</p>
      <p style={LEGAL_STYLE.p}>ご不明点は、アプリ内のお問い合わせフォームからご連絡ください。</p>
    </LegalScreen>
  );
}

function SupportScreen({ onBack, onContact }: { onBack: () => void; onContact: () => void }) {
  const faqs = [
    { q: "写真はどこに保存されますか？", a: "ゲストモードでは端末内のみに保存されます。ログイン後はFirebaseのクラウドに安全に保存され、機種変更後も引き継げます。" },
    { q: "無料で使える範囲を教えてください", a: "写真の追加は3枚まで無料です。写真なしのミッション達成（チェックのみ）は制限なく使えます。プレミアムプランで写真を無制限に追加できます。" },
    { q: "プレミアムプランとは何ですか？", a: "¥600の買い切り購入です。写真を無制限に追加でき、クラウド保存・複数端末同期、PRO限定ミッションパック（台湾の朝ごはん編など）にも対応します。月額料金や自動更新はありません。" },
    { q: "購入を復元するには？", a: "設定 → アカウント → 「購入を復元」をタップしてください。同じApple IDでアプリ内購入した場合、無料で復元できます。" },
    { q: "シールノートのシールを動かすには？", a: "シールをドラッグすると移動できます。2本指でピンチ操作すると拡大縮小、ひねると回転できます。" },
    { q: "アカウントを削除したいです", a: "設定 → アカウント → 「アカウントを削除」からすべてのデータを削除できます。この操作は取り消せません。" },
  ];

  return (
    <LegalScreen title="サポート・FAQ" onBack={onBack}>
      <p style={LEGAL_STYLE.p}>よくあるご質問をまとめました。解決しない場合はお問い合わせください。</p>
      {faqs.map((faq, i) => (
        <div key={i} style={{ marginBottom: 14, background: C.white, borderRadius: 10, border: `1.5px solid rgba(26,32,80,0.1)`, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: `rgba(26,32,80,0.05)`, borderBottom: `1px solid rgba(26,32,80,0.07)` }}>
            <p style={{ fontSize: 11, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.4 }}>Q. {faq.q}</p>
          </div>
          <div style={{ padding: "8px 12px" }}>
            <p style={{ fontSize: 10, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.75 }}>{faq.a}</p>
          </div>
        </div>
      ))}
      <motion.button whileTap={{ scale: 0.97 }} onClick={onContact}
        className="w-full py-3.5 flex items-center justify-center gap-2 font-black mt-2 mb-4"
        style={{ background: C.navy, borderRadius: 12, border: `2px solid ${C.navy}`, fontSize: 12, color: "white", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
        <Mail size={14}/> お問い合わせフォームを開く
      </motion.button>
    </LegalScreen>
  );
}

function ContactScreen({ onBack }: { onBack: () => void }) {
  const openContactForm = () => {
    const opened = window.open(CONTACT_FORM_URL, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = CONTACT_FORM_URL;
  };

  return (
    <LegalScreen title="お問い合わせ" onBack={onBack}>
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <div style={{ width: 70, height: 70, borderRadius: 20, background: C.white, border: `2.5px solid ${C.navy}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 0 rgba(26,32,80,0.08)" }}>
          <MessageCircle size={34} color={C.tealDeep}/>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginBottom: 8 }}>専用フォームから送れます</p>
          <p style={{ fontSize: 10, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.8 }}>
            ご質問・ご要望・不具合のご報告は、Googleフォームで受け付けています。返信が必要な場合だけ、フォーム内に返信先メールアドレスをご記入ください。
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={openContactForm}
          className="w-full py-3.5 flex items-center justify-center gap-2 font-black"
          style={{ background: C.red, borderRadius: 12, border: `2px solid ${C.navy}`, fontSize: 13, color: "white", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
          <Mail size={14}/> お問い合わせフォームを開く
        </motion.button>
        <p style={{ fontSize: 8, color: "rgba(26,32,80,0.45)", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", textAlign: "center", lineHeight: 1.6 }}>
          フォームはブラウザで開きます。個人のメールアドレスはアプリ内に表示されません。
        </p>
      </div>
    </LegalScreen>
  );
}

function SettingsScreen({ authProvider, isPremium, cloudSyncStatus, onLoginRequest, onLogout, onDeleteAccount, onResetGuest, onRestorePurchase, onShowPremium, design, onUpdateDesign }: {
  authProvider: AuthProvider;
  isPremium: boolean;
  cloudSyncStatus: "idle" | "syncing" | "saved" | "error";
  onLoginRequest: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onResetGuest: () => void;
  onRestorePurchase: () => void;
  onShowPremium: () => void;
  design: DesignSettings;
  onUpdateDesign: (design: DesignSettings) => void;
}) {
  const isGuest = authProvider === "guest";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subScreen, setSubScreen] = useState<SubScreen>(null);

  if (subScreen === "privacy") return <PrivacyScreen onBack={() => setSubScreen(null)}/>;
  if (subScreen === "terms") return <TermsScreen onBack={() => setSubScreen(null)}/>;
  if (subScreen === "support") return <SupportScreen onBack={() => setSubScreen(null)} onContact={() => setSubScreen("contact")}/>;
  if (subScreen === "contact") return <ContactScreen onBack={() => setSubScreen(null)}/>;

  const syncLabel = (() => {
    if (isGuest) return "ゲストモード・データは端末内に保存";
    if (!isPremium) return "ログイン中・プレミアムでクラウド保存";
    if (cloudSyncStatus === "syncing") return "クラウド同期中";
    if (cloudSyncStatus === "saved") return "クラウド同期済み";
    if (cloudSyncStatus === "error") return "クラウド同期エラー";
    return "ログイン中・クラウド同期ON";
  })();

  const Row = ({ icon, label, sub, onClick, danger }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void; danger?: boolean }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 transition-all"
      style={{ borderBottom: `1px solid rgba(26,32,80,0.08)`, background: "transparent" }}>
      <span style={{ width: 28, display: "flex", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <div className="flex-1 text-left">
        <p style={{ fontSize: 13, fontWeight: 900, color: danger ? C.red : C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.2 }}>{label}</p>
        {sub && <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 1 }}>{sub}</p>}
      </div>
      <span style={{ fontSize: 14, color: "rgba(26,32,80,0.3)" }}>›</span>
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mx-4 mt-2 mb-3 rounded-xl overflow-hidden" style={{ border: `3px solid ${C.navy}` }}>
        <div className="px-4 py-1.5 flex items-center justify-between" style={{ background: C.banner }}>
          <span className="text-white font-black tracking-widest" style={{ fontSize: 9, fontFamily: "'Nunito', sans-serif" }}>SETTINGS</span>
          <Settings size={13} color="white"/>
        </div>
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: C.cream }}>
          <div>
            <h1 className="font-black" style={{ fontSize: 17, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>設定</h1>
            <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 1 }}>
              {syncLabel}
            </p>
          </div>
          {isPremium
            ? <div style={{ background: C.red, borderRadius: 20, height: 34, minWidth: 82, padding: "0 12px", border: `1.5px solid ${C.navy}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Sparkles size={9} color="white"/><span style={{ fontSize: 9, fontWeight: 900, color: "white", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1 }}>PRO</span></div>
            : <button onClick={onShowPremium} style={{ background: C.gold, borderRadius: 20, height: 34, minWidth: 96, padding: "0 12px", border: `1.5px solid ${C.navy}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 9, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1 }}>無料プラン</span></button>
          }
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 space-y-3">
        {/* Premium */}
        {!isPremium && (
          <motion.button whileTap={{ scale: 0.98 }} onClick={onShowPremium}
            className="w-full py-3.5 flex items-center justify-center gap-2 font-black"
            style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`, borderRadius: 12, border: `2.5px solid ${C.navy}`, fontSize: 13, color: "white", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
            <Sparkles size={14}/> プレミアムにアップグレード（買い切り600円）
          </motion.button>
        )}

        {/* Account */}
        <div style={{ background: C.cream, borderRadius: 12, border: `2px solid ${C.navy}`, overflow: "hidden" }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", padding: "8px 16px 4px", letterSpacing: "0.1em" }}>アカウント</p>
          {isGuest && <Row icon={<Cloud size={17} color={C.tealDeep}/>} label="ログインしてクラウド保存" sub="Google / Apple / メールで同期を開始" onClick={onLoginRequest}/>}
          <Row icon={<RefreshCw size={17} color={C.tealDeep}/>} label="購入を復元" sub="以前の購入を復元する" onClick={onRestorePurchase}/>
          {!isGuest && <Row icon={<LogOut size={17} color={C.navy}/>} label="ログアウト" onClick={onLogout}/>}
          {isGuest && <Row icon={<Trash2 size={17} color={C.red}/>} label="ゲストデータをリセット" sub="端末内のデータをすべて削除" onClick={onResetGuest} danger/>}
          {!isGuest && <Row icon={<AlertTriangle size={17} color={C.red}/>} label="アカウントを削除" sub="Firebase上のすべてのデータを削除" onClick={() => setConfirmDelete(true)} danger/>}
        </div>

        {/* Info */}
        <div style={{ background: C.cream, borderRadius: 12, border: `2px solid ${C.navy}`, overflow: "hidden" }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", padding: "8px 16px 4px", letterSpacing: "0.1em" }}>情報・サポート</p>
          <Row icon={<ShieldCheck size={17} color={C.tealDeep}/>} label="プライバシーポリシー" onClick={() => setSubScreen("privacy")}/>
          <Row icon={<FileText size={17} color={C.tealDeep}/>} label="利用規約" onClick={() => setSubScreen("terms")}/>
          <Row icon={<MessageCircle size={17} color={C.tealDeep}/>} label="サポート" sub="よくある質問" onClick={() => setSubScreen("support")}/>
          <Row icon={<Mail size={17} color={C.tealDeep}/>} label="お問い合わせ" sub="専用フォーム" onClick={() => setSubScreen("contact")}/>
        </div>

        {/* Display Settings */}
        <div style={{ background: C.cream, borderRadius: 12, border: `2px solid ${C.navy}`, overflow: "hidden" }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", padding: "8px 16px 4px", letterSpacing: "0.1em" }}>表示設定</p>
          <div className="w-full flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid rgba(26,32,80,0.08)`, background: "transparent" }}>
            <div className="flex items-center gap-3">
              <span style={{ width: 28, display: "flex", justifyContent: "center", flexShrink: 0 }}><Eye size={17} color={C.tealDeep}/></span>
              <div className="text-left">
                <p style={{ fontSize: 13, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.2 }}>ミッション名を表示する</p>
                <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 1 }}>一覧画面でのミッション名の表示切り替え</p>
              </div>
            </div>
            <button 
              id="toggle-mission-names"
              onClick={() => onUpdateDesign({ ...design, hideMissionNames: !design.hideMissionNames })}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 ease-in-out"
              style={{
                background: !design.hideMissionNames ? C.red : "rgba(26,32,80,0.15)",
                border: `1.5px solid ${C.navy}`
              }}
            >
              <span
                className="pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                style={{
                  transform: !design.hideMissionNames ? "translateX(20px)" : "translateX(2px)",
                  background: C.cream,
                  border: `1.5px solid ${C.navy}`
                }}
              />
            </button>
          </div>
        </div>

        <p className="text-center pb-12" style={{ fontSize: 9, color: "rgba(26,32,80,0.3)", fontFamily: "'Nunito', sans-serif" }}>台湾ミッション図鑑 v1.0.0</p>
      </div>

      {/* Confirm delete dialog */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center px-8"
            style={{ background: "rgba(10,18,24,0.8)" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: C.cream, borderRadius: 18, border: `3px solid ${C.navy}`, overflow: "hidden", width: "100%" }}>
              <div className="px-5 py-4 text-center" style={{ background: C.red }}>
                <AlertTriangle size={28} color="white"/>
                <h3 className="font-black text-white" style={{ fontSize: 15, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 4 }}>アカウントを削除しますか？</h3>
              </div>
              <div className="px-5 py-4">
                <p style={{ fontSize: 11, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.7, marginBottom: 16, textAlign: "center" }}>
                  Firebase上のアカウント情報・写真・メモ・達成ミッション・獲得シールがすべて削除されます。この操作は取り消せません。
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 font-black"
                    style={{ background: C.creamDark, borderRadius: 8, border: `2px solid rgba(26,32,80,0.2)`, fontSize: 12, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
                    キャンセル
                  </button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setConfirmDelete(false); onDeleteAccount(); }} className="flex-1 py-3 font-black text-white"
                    style={{ background: C.red, borderRadius: 8, border: `2px solid ${C.navy}`, fontSize: 12, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
                    削除する
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Premium Modal ────────────────────────────────────────────────────────────

function PremiumModal({ triggered, onPurchase, onRestore, onClose }: {
  triggered?: "limit";
  onPurchase: () => Promise<void>;
  onRestore: () => Promise<void>;
  onClose: () => void;
}) {
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageFromError = (err: unknown) => {
    const maybeError = err as { userCancelled?: boolean; message?: string; errorMessage?: string };
    if (maybeError?.userCancelled) return null;
    return maybeError?.errorMessage || maybeError?.message || "購入処理を完了できませんでした。少し時間をおいてもう一度お試しください。";
  };
  const handlePurchase = async () => {
    setPurchasing(true);
    setError(null);
    try {
      await onPurchase();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setPurchasing(false);
    }
  };
  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    try {
      await onRestore();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setRestoring(false);
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end"
      style={{ background: "rgba(10,18,24,0.82)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} className="w-full flex flex-col"
        style={{ background: C.cream, borderRadius: "24px 24px 0 0", border: `3px solid ${C.navy}`, borderBottom: "none", overflow: "hidden", maxHeight: "88dvh" }}>

        <div className="px-5 py-5 text-center relative" style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)` }}>
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 14, background: "rgba(255,255,255,0.15)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} color="white"/>
          </button>
          <Sparkles size={36} color={C.gold}/>
          <h2 className="font-black text-white" style={{ fontSize: 20, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 6 }}>プレミアムプラン</h2>
          <div style={{ background: C.gold, borderRadius: 20, padding: "4px 16px", display: "inline-block", marginTop: 8, border: `1.5px solid ${C.navy}` }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>買い切り ¥600</span>
          </div>
          {triggered === "limit" && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", marginTop: 8 }}>
              写真の保存が3枚に達しました
            </p>
          )}
        </div>

        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto scrollbar-hide" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          {[
            { icon: <ImagePlus size={22} color={C.red}/>,  text: "写真を無制限に追加", sub: "無料プランは3枚まで" },
            { icon: <Cloud size={22} color={C.tealDark}/>,  text: "クラウド保存対応", sub: "ログイン後、複数端末で同期" },
            { icon: <Unlock size={22} color={C.navyLight}/>,text: "PRO限定ミッションパックを解放", sub: "「台湾の朝ごはん編」が今すぐ遊べる・今後も追加" },
            { icon: <Gift size={22} color={C.gold}/>,        text: "買い切り・追加料金なし", sub: "一度購入すれば永久に使えます" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <span style={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 900, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.2 }}>{f.text}</p>
                <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{f.sub}</p>
              </div>
            </div>
          ))}

          {error && (
            <div style={{ background: "rgba(212,48,32,0.08)", border: `1.5px solid rgba(212,48,32,0.3)`, borderRadius: 10, padding: "9px 10px" }}>
              <p style={{ fontSize: 9, color: C.red, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", lineHeight: 1.6, fontWeight: 800 }}>{error}</p>
            </div>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={handlePurchase} disabled={purchasing || restoring}
            className="w-full py-4 font-black text-white text-center flex items-center justify-center gap-2 mt-2"
            style={{ background: `linear-gradient(135deg, ${C.red} 0%, ${C.redDark} 100%)`, borderRadius: 12, border: `2.5px solid ${C.navy}`, fontSize: 15, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", boxShadow: `0 4px 16px rgba(212,48,32,0.4)`, opacity: purchasing || restoring ? 0.7 : 1 }}>
            {purchasing ? <Spinner/> : <><CreditCard size={16}/> ¥600 で購入する</>}
          </motion.button>

          <button onClick={handleRestore} disabled={purchasing || restoring} className="w-full py-2.5 flex items-center justify-center gap-2"
            style={{ background: C.creamDark, borderRadius: 10, border: `1.5px solid rgba(26,32,80,0.18)`, fontSize: 11, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif", fontWeight: 700, opacity: purchasing || restoring ? 0.7 : 1 }}>
            {restoring ? <Spinner dark/> : "購入を復元する"}
          </button>

          <p className="text-center" style={{ fontSize: 8, color: "rgba(26,32,80,0.35)", fontFamily: "'Nunito', sans-serif", lineHeight: 1.5 }}>
            購入はApp Storeアカウントに請求されます。<br/>一度購入すると追加料金は発生しません。
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Design Adjust Mode ───────────────────────────────────────────────────────

function DesignAdjustPanel({ settings, onChange, onClose, onReset }: {
  settings: DesignSettings;
  onChange: (next: DesignSettings) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const setValue = <K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };
  const copySettings = async () => {
    const text = JSON.stringify(settings, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("この設定をコピーしてください", text);
    }
  };
  const colorRows: { key: keyof Pick<DesignSettings, "bg" | "cream" | "notebookPaper" | "banner" | "red" | "navy" | "gold">; label: string }[] = [
    { key: "bg", label: "背景" },
    { key: "cream", label: "紙色" },
    { key: "notebookPaper", label: "ノート" },
    { key: "banner", label: "見出し帯" },
    { key: "red", label: "赤" },
    { key: "navy", label: "線・文字" },
    { key: "gold", label: "アクセント" },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end"
      style={{ background: "rgba(26,32,80,0.34)" }}
    >
      <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }}
        className="w-full"
        style={{ background: C.cream, borderTop: `3px solid ${C.navy}`, borderRadius: "18px 18px 0 0", maxHeight: "78dvh", overflowY: "auto" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3" style={{ background: C.cream, borderBottom: `1.5px solid ${C.creamDark}` }}>
          <div>
            <p className="font-black" style={{ fontSize: 15, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>デザイン調整</p>
            <p style={{ fontSize: 9, color: C.tealDeep, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>変更は自動保存されます</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: C.white, border: `1.5px solid ${C.navy}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color={C.navy}/>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {colorRows.map(row => (
              <label key={row.key} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={settings[row.key]}
                  onChange={e => setValue(row.key, e.target.value)}
                  style={{ width: 42, height: 42, border: `2px solid ${C.navy}`, borderRadius: 10, background: C.white, padding: 2 }}
                />
                <span style={{ fontSize: 9, color: C.navy, fontWeight: 900, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{row.label}</span>
              </label>
            ))}
          </div>

          {[
            { key: "tileSize" as const, label: "背景タイルの大きさ", min: 32, max: 260, unit: "px" },
            { key: "cardRadius" as const, label: "カードの角丸", min: 8, max: 30, unit: "px" },
            { key: "cardBorder" as const, label: "カードの枠線", min: 2, max: 8, unit: "px" },
          ].map(row => (
            <div key={row.key} style={{ background: C.white, border: `1.5px solid ${C.creamDark}`, borderRadius: 12, padding: "12px 14px" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-black" style={{ fontSize: 11, color: C.navy, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{row.label}</span>
                <span style={{ fontSize: 11, color: C.tealDeep, fontFamily: "'Nunito', sans-serif", fontWeight: 900 }}>{settings[row.key]}{row.unit}</span>
              </div>
              <input
                type="range"
                min={row.min}
                max={row.max}
                value={settings[row.key]}
                onChange={e => setValue(row.key, Number(e.target.value))}
                className="w-full"
                style={{ accentColor: C.red }}
              />
            </div>
          ))}

          <div className="flex gap-2 pb-3">
            <button onClick={onReset} className="flex-1 py-3 font-black" style={{ background: C.white, border: `2px solid ${C.navy}`, borderRadius: 10, color: C.navy, fontSize: 12, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
              初期値に戻す
            </button>
            <button onClick={copySettings} className="flex-1 py-3 font-black" style={{ background: C.white, border: `2px solid ${C.navy}`, borderRadius: 10, color: C.navy, fontSize: 12, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
              値をコピー
            </button>
            <button onClick={onClose} className="flex-1 py-3 font-black text-white" style={{ background: C.red, border: `2px solid ${C.navy}`, borderRadius: 10, fontSize: 12, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>
              完了
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<"loading" | "login" | "app">("loading");
  const [design, setDesign] = useState<DesignSettings>(() => loadDesignSettings());
  const [storageReady, setStorageReady] = useState(false);
  const [authProvider, setAuthProvider] = useState<AuthProvider>("guest");
  const [isPremium, setIsPremium] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [premiumTrigger, setPremiumTrigger] = useState<"limit" | undefined>();
  const [mainTab, setMainTab] = useState<"mission" | "notebook" | "settings">("mission");
  const [view, setView] = useState<"home" | "pack">("home");
  const [activePack, setActivePack] = useState<Pack>(PACKS[0]);
  const [achieved, setAchieved] = useState<Set<number>>(new Set());
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [memos, setMemos] = useState<Record<number, string>>({});
  const [stickerPositions, setStickerPositions] = useState<Record<number, StickerPos>>({});
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [celebratingCard, setCelebratingCard] = useState<Card | null>(null);
  const [celebratingPhoto, setCelebratingPhoto] = useState<string | undefined>();
  const [newStickerId, setNewStickerId] = useState<number | null>(null);
  const [photoUploadCard, setPhotoUploadCard] = useState<Card | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  const revenueCatConfiguredRef = useRef(false);
  const lastCloudSaveRef = useRef("");
  const savingRef = useRef(new Set<Promise<unknown>>());
  const pausedCloudUid = useRef<string | null>(null);
  const deletingRef = useRef(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--tm-bg", design.bg);
    root.style.setProperty("--tm-bg-dark", shade(design.bg, -30));
    root.style.setProperty("--tm-teal-deep", shade(design.bg, -78));
    root.style.setProperty("--tm-cream", design.cream);
    root.style.setProperty("--tm-cream-dark", shade(design.cream, -24));
    root.style.setProperty("--tm-note-paper", design.notebookPaper);
    root.style.setProperty("--tm-red", design.red);
    root.style.setProperty("--tm-red-dark", shade(design.red, -34));
    root.style.setProperty("--tm-banner", design.banner);
    root.style.setProperty("--tm-navy", design.navy);
    root.style.setProperty("--tm-navy-light", shade(design.navy, 32));
    root.style.setProperty("--tm-gold", design.gold);
    root.style.setProperty("--tm-white", shade(design.cream, 18));
    root.style.setProperty("--tm-tile-size", `${design.tileSize}px ${design.tileSize}px`);
    root.style.setProperty("--tm-card-radius", `${design.cardRadius}px`);
    root.style.setProperty("--tm-card-border", `${design.cardBorder}px`);
    try { localStorage.setItem(DESIGN_KEY, JSON.stringify(design)); } catch {}
  }, [design]);

  const unlockPremium = () => {
    setIsPremium(true);
    try { localStorage.setItem("tw_premium", "1"); } catch {}
    setShowPremium(false);
  };

  useEffect(() => {
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
      setAuthReady(true);
      return;
    }
    const { auth } = getFirebaseServices();
    setPersistence(auth, browserLocalPersistence).catch(error => {
      console.warn("Firebase persistence could not be enabled.");
    });
    if (!Capacitor.isNativePlatform()) {
      getRedirectResult(auth).catch(error => {
        console.warn("Firebase redirect login could not be completed.");
      });
    }
    return onAuthStateChanged(auth, user => {
      if (!user) pausedCloudUid.current = null;
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) return;
      const provider = providerToAuthProvider(user);
      setAuthProvider(provider);
      try {
        localStorage.setItem("tw_auth", provider);
        localStorage.setItem("tw_loggedin", "1");
      } catch {}
      setMainTab("mission");
      setView("home");
      setScreen("app");
    });
  }, []);

  const ensureRevenueCatConfigured = async () => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error("App Store課金はiPhone実機またはTestFlightで確認できます。ブラウザでは購入できません。");
    }
    if (revenueCatConfiguredRef.current) return;
    if (!REVENUECAT_API_KEY) {
      throw new Error("RevenueCatのAPIキーが設定されていません。リポジトリルートの .env を確認してビルドし直してください。");
    }
    const configured = await Purchases.isConfigured();
    if (!configured.isConfigured) {
      await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN });
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        preferredUILocaleOverride: "ja-JP",
      });
    }
    revenueCatConfiguredRef.current = true;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      let loggedIn: string | null = null;
      try {
        loggedIn = localStorage.getItem("tw_loggedin");
      } catch {
        loggedIn = null;
      }
      setScreen(loggedIn ? "app" : "login");
    }, 2200);
    return () => clearTimeout(timer);
  }, [authReady]);

  useEffect(() => {
    if (screen !== "app") return;
    try {
      const a = localStorage.getItem("tw_a_v5");
      const p = localStorage.getItem("tw_p_v5");
      const m = localStorage.getItem("tw_m_v5");
      const sp = localStorage.getItem("tw_sp_v5");
      const pr = localStorage.getItem("tw_premium");
      const auth = localStorage.getItem("tw_auth");
      if (a) {
        const s = new Set<number>(JSON.parse(a));
        setAchieved(s);
      }
      if (p) setPhotos(JSON.parse(p));
      if (m) setMemos(JSON.parse(m));
      if (sp) setStickerPositions(JSON.parse(sp));
      if (pr) setIsPremium(true);
      if (auth && !firebaseUser) setAuthProvider(auth as AuthProvider);
    } catch (error) {
      console.warn("Saved app data could not be restored. Starting with a clean local state.", error);
    } finally {
      setStorageReady(true);
    }
  }, [screen, firebaseUser]);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("tw_a_v5", JSON.stringify(Array.from(achieved))); } catch {}
  }, [achieved, storageReady]);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("tw_p_v5", JSON.stringify(photos)); } catch {}
  }, [photos, storageReady]);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("tw_m_v5", JSON.stringify(memos)); } catch {}
  }, [memos, storageReady]);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("tw_sp_v5", JSON.stringify(stickerPositions)); } catch {}
  }, [stickerPositions, storageReady]);

  useEffect(() => {
    if (screen !== "app" || !storageReady) return;
    let cancelled = false;
    lastCloudSaveRef.current = "";

    if (!firebaseUser || !isPremium) {
      setCloudReady(true);
      setCloudSyncStatus("idle");
      return;
    }

    const restoreCloudData = async () => {
      setCloudReady(false);
      setCloudSyncStatus("syncing");
      try {
        const data = await loadCloudData(firebaseUser.uid);
        if (cancelled || pausedCloudUid.current === firebaseUser.uid) return;
        if (data) {
          setAchieved(prev => new Set([...Array.from(prev), ...(data.achieved ?? [])]));
          setPhotos(prev => ({ ...normalizeRecordKeys(data.photos), ...prev }));
          setMemos(prev => ({ ...normalizeRecordKeys(data.memos), ...prev }));
          setStickerPositions(prev => ({ ...normalizeRecordKeys(data.stickerPositions), ...prev }));
        }
        setCloudSyncStatus("saved");
      } catch (error) {
        console.warn("Cloud data could not be restored.");
        setCloudSyncStatus("error");
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    };

    restoreCloudData();
    return () => { cancelled = true; };
  }, [screen, storageReady, firebaseUser?.uid, isPremium]);

  useEffect(() => {
    if (screen !== "app" || !storageReady || !cloudReady || !firebaseUser || !isPremium) return;
    const snapshot = JSON.stringify({
      achieved: Array.from(achieved).sort((a, b) => a - b),
      photos,
      memos,
      stickerPositions,
    });
    if (snapshot === lastCloudSaveRef.current) return;

    const timer = window.setTimeout(async () => {
      if (pausedCloudUid.current === firebaseUser.uid) return;
      setCloudSyncStatus("syncing");
      const save = saveCloudData(firebaseUser.uid, { achieved, photos, memos, stickerPositions });
      savingRef.current.add(save);
      try {
        const cloudPhotos = await save;
        if (pausedCloudUid.current === firebaseUser.uid) return;
        setPhotos(prev => ({ ...prev, ...cloudPhotos }));
        lastCloudSaveRef.current = JSON.stringify({
          achieved: Array.from(achieved).sort((a, b) => a - b),
          photos: { ...photos, ...cloudPhotos },
          memos,
          stickerPositions,
        });
        setCloudSyncStatus("saved");
      } catch (error) {
        console.warn("Cloud data could not be saved.");
        setCloudSyncStatus("error");
      } finally {
        savingRef.current.delete(save);
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [screen, storageReady, cloudReady, firebaseUser?.uid, isPremium, achieved, photos, memos, stickerPositions]);


  useEffect(() => {
    if (screen !== "app") return;
    let cancelled = false;
    const refreshPremiumStatus = async () => {
      try {
        await ensureRevenueCatConfigured();
        const { customerInfo } = await Purchases.getCustomerInfo();
        if (!cancelled && hasPremiumEntitlement(customerInfo)) {
          unlockPremium();
        }
      } catch (error) {
        console.warn("RevenueCat could not be initialized yet.");
      }
    };
    refreshPremiumStatus();
    return () => { cancelled = true; };
  }, [screen]);

  const addStickerPos = (cardId: number) => {
    setStickerPositions(prev => {
      if (prev[cardId]) return prev;
      return { ...prev, [cardId]: {
        x: 45 + Math.floor(Math.random() * 190),
        y: 30 + Math.floor(Math.random() * 600),
        rotate: (Math.random() - 0.5) * 24,
        scale: 1,
      }};
    });
  };

  const handleAchieve = () => { if (selectedCard) setPhotoUploadCard(selectedCard); };
  const photoCount = Object.keys(photos).length;
  const FREE_PHOTO_LIMIT = 3;

  const handleConfirm = (url: string | null, memo: string) => {
    if (!photoUploadCard) return;
    const card = photoUploadCard;
    setAchieved(p => new Set([...p, card.id]));
    const wouldAddPhoto = url && !photos[card.id];
    if (wouldAddPhoto && !isPremium && photoCount >= FREE_PHOTO_LIMIT) {
      setPremiumTrigger("limit"); setShowPremium(true);
      setPhotoUploadCard(null); setSelectedCard(null);
      return;
    }
    if (url) setPhotos(p => ({ ...p, [card.id]: url }));
    if (memo.trim()) setMemos(p => ({ ...p, [card.id]: memo.trim() }));
    addStickerPos(card.id);
    setPhotoUploadCard(null); setSelectedCard(null);
    setTimeout(() => { setCelebratingCard(card); setCelebratingPhoto(url || undefined); }, 300);
  };
  const handleSkip = () => {
    if (!photoUploadCard) return;
    const card = photoUploadCard;
    setAchieved(p => new Set([...p, card.id]));
    addStickerPos(card.id);
    setPhotoUploadCard(null); setSelectedCard(null);
    setTimeout(() => { setCelebratingCard(card); setCelebratingPhoto(undefined); }, 300);
  };

  const handleCelebrationClose = () => {
    const card = celebratingCard;
    setCelebratingCard(null);
    setCelebratingPhoto(undefined);
    if (!card) return;
    setNewStickerId(card.id);
    setMainTab("notebook");
  };

  const handleSelectPack = (id: string) => {
    setNewStickerId(null);
    const pack = PACKS.find(p => p.id === id);
    if (pack) { setActivePack(pack); setView("pack"); }
  };

  const handleLogin = (provider: AuthProvider) => {
    setAuthProvider(provider);
    try {
      localStorage.setItem("tw_auth", provider);
      localStorage.setItem("tw_loggedin", "1");
    } catch {}
    setStorageReady(true);
    setMainTab("mission");
    setView("home");
    setScreen("app");
  };
  const handleEmailAuth = async (email: string, password: string, mode: "login" | "signup") => {
    try {
      const { auth } = getFirebaseServices();
      await setPersistence(auth, browserLocalPersistence);
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      throw new Error(authErrorMessage(error));
    }
  };
  const handleOAuth = async (provider: "apple" | "google") => {
    try {
      const isNative = Capacitor.isNativePlatform();
      
      const { auth } = getFirebaseServices();
      const authProvider = provider === "google"
        ? new GoogleAuthProvider()
        : new OAuthProvider("apple.com");
      
      authProvider.addScope("email");
      if (provider === "google") {
        authProvider.addScope("profile");
      }
      if (provider === "apple" && authProvider instanceof OAuthProvider) {
        authProvider.addScope("name");
        authProvider.setCustomParameters({ locale: "ja_JP" });
      }

      if (isNative) {
        await signInWithNativeOAuth(provider);
      } else {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithPopup(auth, authProvider);
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : authErrorMessage(error));
    }
  };
  const handlePremium = async () => {
    await ensureRevenueCatConfigured();
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    const lifetimePackage = pickLifetimePackage(packages);
    if (!lifetimePackage) {
      const foundProducts = packages.map(pkg => pkg.product.identifier).join(", ") || "なし";
      throw new Error(`RevenueCatで ${REVENUECAT_PRODUCT_ID} が見つかりませんでした。現在アプリに返ってきている商品: ${foundProducts}`);
    }
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: lifetimePackage });
    if (!hasPremiumEntitlement(customerInfo)) {
      throw new Error(`購入は完了しましたが、プレミアム権限を確認できませんでした。RevenueCatのEntitlementが ${REVENUECAT_ENTITLEMENT_ID} になっているか確認してください。`);
    }
    unlockPremium();
  };
  const handleRestorePremium = async () => {
    await ensureRevenueCatConfigured();
    const { customerInfo } = await Purchases.restorePurchases();
    if (!hasPremiumEntitlement(customerInfo)) {
      throw new Error("復元できるプレミアム購入が見つかりませんでした。同じApple IDで購入済みか確認してください。");
    }
    unlockPremium();
  };
  const handleLogout = async () => {
    try {
      const { auth } = getFirebaseServices();
      await signOut(auth);
    } catch (error) {
      console.warn("Firebase sign-out failed.");
    }
    try {
      ["tw_loggedin", "tw_auth", "tw_a_v5", "tw_p_v5", "tw_m_v5", "tw_sp_v5", "tw_premium"].forEach(k => localStorage.removeItem(k));
    } catch {}
    setFirebaseUser(null);
    setCloudReady(false);
    setCloudSyncStatus("idle");
    setAchieved(new Set());
    setPhotos({});
    setMemos({});
    setStickerPositions({});
    setIsPremium(false);
    setAuthProvider("guest");
    setScreen("login");
  };
  const handleDeleteAccount = async () => {
    if (deletingRef.current) return;
    const user = firebaseUser;
    if (!user) {
      window.alert("ログイン状態を確認できません。再度ログインしてから削除してください。");
      return;
    }
    deletingRef.current = true;
    setDeletingAccount(true);
    let cleanupStarted = false;
    try {
      const { auth, db, storage } = getFirebaseServices();
      if (auth.currentUser?.uid !== user.uid) throw new Error("auth/requires-recent-login");
      const token = await user.getIdTokenResult();
      if (Date.now() - new Date(token.authTime).getTime() >= 4 * 60 * 1000) {
        throw new Error("auth/requires-recent-login");
      }
      pausedCloudUid.current = user.uid;
      cleanupStarted = true;
      await Promise.allSettled([...savingRef.current]);
      const folder = storageRef(storage, `users/${user.uid}/mission-photos`);
      await removeCloudAccount({
        listPhotos: async () => (await listAll(folder)).items,
        deletePhoto: deleteObject,
        deleteDocument: () => deleteDoc(doc(db, "users", user.uid, "appData", "main")),
        deleteAccount: () => deleteUser(user),
      });
    } catch (error) {
      if (!cleanupStarted || (error as { code?: string })?.code === "auth/requires-recent-login") {
        window.alert("アカウントの削除は完了していません。再度ログインしてから削除してください。");
      } else {
        window.alert("削除は完了していません。一部のクラウドデータがすでに削除された可能性があります。同期を一時停止しました。通信状態を確認してもう一度「アカウントを削除」を実行してください。");
      }
      return;
    } finally {
      deletingRef.current = false;
      setDeletingAccount(false);
    }
    setStorageReady(false);
    try {
      ["tw_loggedin","tw_auth","tw_a_v5","tw_p_v5","tw_m_v5","tw_sp_v5","tw_premium"].forEach(k => localStorage.removeItem(k));
    } catch {}
    setFirebaseUser(null);
    setCloudReady(false);
    setCloudSyncStatus("idle");
    setAchieved(new Set()); setPhotos({}); setMemos({}); setStickerPositions({});
    setIsPremium(false); setAuthProvider("guest");
    setScreen("login");
  };
  const handleResetGuest = () => {
    try {
      ["tw_a_v5","tw_p_v5","tw_m_v5","tw_sp_v5","tw_premium"].forEach(k => localStorage.removeItem(k));
    } catch {}
    setAchieved(new Set()); setPhotos({}); setMemos({}); setStickerPositions({});
    setIsPremium(false);
  };

  if (deletingAccount) return <AppShell><p role="status" className="p-6">アカウントとクラウドデータを削除しています…</p></AppShell>;
  if (screen === "loading") return <LoadingScreen/>;
  if (screen === "login") return <LoginScreen onLogin={handleLogin} onEmailAuth={handleEmailAuth} onOAuth={handleOAuth}/>;

  return (
    <AppShell>
        {/* Content — leaves room for bottom nav */}
        <div className="app-content-area overflow-hidden">
          <AnimatePresence mode="wait">
            {mainTab === "settings" ? (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0 flex flex-col">
                <SettingsScreen authProvider={authProvider} isPremium={isPremium} cloudSyncStatus={cloudSyncStatus}
                  onLoginRequest={() => setScreen("login")}
                  onLogout={handleLogout} onDeleteAccount={handleDeleteAccount}
                  onResetGuest={handleResetGuest}
                  onRestorePurchase={() => { setShowPremium(true); setPremiumTrigger(undefined); }}
                  onShowPremium={() => { setShowPremium(true); setPremiumTrigger(undefined); }}
                  design={design} onUpdateDesign={setDesign}/>
              </motion.div>
            ) : mainTab === "notebook" ? (
              <motion.div key="notebook" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0 flex flex-col">
                <NotebookScreen achieved={achieved} photos={photos} stickerPositions={stickerPositions} newStickerId={newStickerId}
                  onClearNewSticker={() => setNewStickerId(null)}
                  onUpdatePosition={(id, x, y, rotate, scale) => setStickerPositions(p => ({ ...p, [id]: { x, y, rotate, scale } }))}/>
              </motion.div>
            ) : mainTab === "mission" ? (
              view === "home" ? (
                <motion.div key="pack-home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col">
                  <PackHomeScreen onSelectPack={handleSelectPack} achieved={achieved} isPremium={isPremium} onShowPremium={() => { setShowPremium(true); setPremiumTrigger(undefined); }}/>
                </motion.div>
              ) : (
                <motion.div key="pack-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0 flex flex-col">
                  <PackDetailScreen pack={activePack} achieved={achieved} photos={photos} onBack={() => setView("home")} onSelectCard={setSelectedCard} design={design}/>
                </motion.div>
              )
            ) : null}
          </AnimatePresence>
        </div>

        {/* Bottom tab bar */}
        <div className="app-bottom-tabbar" style={{
          background: C.cream,
          borderTop: `2.5px solid ${C.navy}`,
        }}>
          {([
            { id: "mission",  label: "ミッション",   Icon: Map },
            { id: "notebook", label: "ノート",       Icon: BookOpen },
            { id: "settings", label: "設定",         Icon: Settings },
          ] as const).map((tab, i, arr) => {
            const handleClick = () => {
              setNewStickerId(null);
              setMainTab(tab.id as typeof mainTab);
              if (tab.id === "mission") setView("home");
            };
            return (
              <button key={tab.id} onClick={handleClick} className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
                style={{ background: mainTab === tab.id ? "rgba(26,32,80,0.06)" : "transparent", borderRight: i < arr.length - 1 ? `1.5px solid ${C.creamDark}` : "none" }}>
                <tab.Icon size={18} color={mainTab === tab.id ? C.navy : C.mutedInk}/>
                <span className="font-black" style={{ fontSize: 8.5, lineHeight: 1, color: mainTab === tab.id ? C.navy : C.mutedInk, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'SF Pro JP', sans-serif" }}>{tab.label}</span>
                {mainTab === tab.id && <div style={{ width: 18, height: 2.5, borderRadius: 2, background: C.red, marginTop: 1 }}/>}
              </button>
            );
          })}
        </div>

        {/* Overlays */}
        <AnimatePresence>
          {selectedCard && <CardDetail card={selectedCard} unlocked={achieved.has(selectedCard.id)} photoUrl={photos[selectedCard.id]} memo={memos[selectedCard.id]} onClose={() => setSelectedCard(null)} onAchieve={handleAchieve} onPhotoUpload={(id, url) => { setPhotos(p => ({ ...p, [id]: url })); setSelectedCard(null); }} onMemoSave={(id, text) => setMemos(p => ({ ...p, [id]: text }))}/>}
        </AnimatePresence>
        <AnimatePresence>
          {photoUploadCard && <PhotoUploadModal card={photoUploadCard} onConfirm={handleConfirm} onSkip={handleSkip} onClose={() => setPhotoUploadCard(null)}/>}
        </AnimatePresence>
        <AnimatePresence>
          {celebratingCard && <AchievedCelebration card={celebratingCard} photoUrl={celebratingPhoto} onClose={handleCelebrationClose}/>}
        </AnimatePresence>
        <AnimatePresence>
          {showPremium && <PremiumModal triggered={premiumTrigger} onPurchase={handlePremium} onRestore={handleRestorePremium} onClose={() => setShowPremium(false)}/>}
        </AnimatePresence>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </AppShell>
  );
}
