// 全局变量
let imagesData = [];
let currentLanguage = 'en';
let translations = {};

// 图片分类常量 - 添加这个新的常量定义
const CATEGORIES = {
    ALL: 'all',
    POLAROID: 'polaroid',
    MAGAZINE: 'magazine',
    FRAME: 'frame',
    PORTRAIT: 'portrait'
};

// 内嵌图片数据 - 使用新的分类
const embeddedImagesData = [
  {
    "id": "p001",
    "name": {
      "en": "Sunset View",
      "zh": "日落风景",
      "zh-tw": "日落風景",
      "ko": "일몰 풍경",
      "ja": "夕日の風景",
      "fr": "Vue du coucher de soleil",
      "de": "Sonnenuntergang"
    },
    "description": {
      "en": "Beautiful sunset view with vibrant colors.",
      "zh": "美丽的日落风景照片，色彩鲜艳。",
      "zh-tw": "美麗的日落風景照片，色彩鮮豔。",
      "ko": "선명한 색상의 아름다운 일몰 전망.",
      "ja": "鮮やかな色彩の美しい夕日の風景。",
      "fr": "Belle vue du coucher de soleil aux couleurs vibrantes.",
      "de": "Schöner Sonnenuntergang mit lebendigen Farben."
    },
    "category": CATEGORIES.FRAME,  // 已变更为新的分类
    "url": "images/IMG_1096.JPG",
    "thumbnail": "thumbnails/IMG_1096_副本.JPG",
    "format": "jpg",
    "dpi": 300,
    "width_px": 1200,
    "height_px": 900
  },
  {
    "id": "p002",
    "name": {
      "en": "Green Plant",
      "zh": "绿色植物",
      "zh-tw": "綠色植物",
      "ko": "녹색 식물",
      "ja": "緑の植物",
      "fr": "Plante verte",
      "de": "Grüne Pflanze"
    },
    "description": {
      "en": "Close-up shot of a beautiful green plant.",
      "zh": "美丽绿色植物的特写照片。",
      "zh-tw": "美麗綠色植物的特寫照片。",
      "ko": "아름다운 녹색 식물의 클로즈업 사진.",
      "ja": "美しい緑の植物のクローズアップショット。",
      "fr": "Gros plan d'une belle plante verte.",
      "de": "Nahaufnahme einer schönen grünen Pflanze."
    },
    "category": CATEGORIES.POLAROID,  // 已变更为新的分类
    "url": "images/IMG_1110.JPG",
    "thumbnail": "thumbnails/IMG_1110_副本.JPG",
    "format": "jpg",
    "dpi": 300,
    "width_px": 1200,
    "height_px": 900
  },
  {
    "id": "p003",
    "name": {
      "en": "Abstract Art",
      "zh": "抽象艺术",
      "zh-tw": "抽象藝術",
      "ko": "추상 미술",
      "ja": "抽象芸術",
      "fr": "Art abstrait",
      "de": "Abstrakte Kunst"
    },
    "description": {
      "en": "Modern abstract art with bold shapes and colors.",
      "zh": "现代抽象艺术，大胆的形状和色彩。",
      "zh-tw": "現代抽象藝術，大膽的形狀和色彩。",
      "ko": "대담한 모양과 색상의 현대 추상 미술.",
      "ja": "大胆な形や色を使用したモダンな抽象芸術。",
      "fr": "Art abstrait moderne avec des formes et des couleurs audacieuses.",
      "de": "Moderne abstrakte Kunst mit kühnen Formen und Farben."
    },
    "category": CATEGORIES.MAGAZINE,  // 已变更为新的分类
    "url": "images/IMG_1119.JPG",
    "thumbnail": "thumbnails/IMG_1119_副本.JPG",
    "format": "jpg",
    "dpi": 300,
    "width_px": 1200,
    "height_px": 900
  },
  {
    "id": "p004",
    "name": {
      "en": "Artistic Flowers",
      "zh": "艺术花卉",
      "zh-tw": "藝術花卉",
      "ko": "예술적인 꽃",
      "ja": "芸術的な花",
      "fr": "Fleurs artistiques",
      "de": "Künstlerische Blumen"
    },
    "description": {
      "en": "Artistic close-up of beautiful flowers.",
      "zh": "富有艺术气息的花卉特写。",
      "zh-tw": "富有藝術氣息的花卉特寫。",
      "ko": "아름다운 꽃의 예술적인 클로즈업.",
      "ja": "美しい花の芸術的なクローズアップ。",
      "fr": "Gros plan artistique de belles fleurs.",
      "de": "Künstlerische Nahaufnahme von schönen Blumen."
    },
    "category": "template",
    "url": "images/IMG_1105.PNG",
    "thumbnail": "thumbnails/IMG_1105_副本.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 900,
    "height_px": 1100
  },
  {
    "id": "p005",
    "name": {
      "en": "Child Portrait",
      "zh": "儿童肖像",
      "zh-tw": "兒童肖像",
      "ko": "아동 초상화",
      "ja": "子供のポートレート",
      "fr": "Portrait d'enfant",
      "de": "Kinderporträt"
    },
    "description": {
      "en": "Portrait work full of childlike innocence.",
      "zh": "充满童真的儿童肖像作品。",
      "zh-tw": "充滿童真的兒童肖像作品。",
      "ko": "아이다운 순수함이 가득한 초상화 작품.",
      "ja": "子供らしい無邪気さにあふれたポートレート作品。",
      "fr": "Œuvre de portrait pleine d'innocence enfantine.",
      "de": "Porträtarbeit voller kindlicher Unschuld."
    },
    "category": "portrait",
    "url": "images/IMG_1106.PNG",
    "thumbnail": "thumbnails/IMG_1106_副本.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 800,
    "height_px": 1000
  },
  {
    "id": "p006",
    "name": {
      "en": "Travel Memories",
      "zh": "旅行回忆",
      "zh-tw": "旅行回憶",
      "ko": "여행 추억",
      "ja": "旅の思い出",
      "fr": "Souvenirs de voyage",
      "de": "Reiseerinnerungen"
    },
    "description": {
      "en": "Beautiful moments captured during travel.",
      "zh": "旅行中捕捉的美好瞬间。",
      "zh-tw": "旅行中捕捉的美好瞬間。",
      "ko": "여행 중에 포착한 아름다운 순간들.",
      "ja": "旅行中に捉えた美しい瞬間。",
      "fr": "Beaux moments capturés pendant le voyage.",
      "de": "Schöne Momente, die während der Reise festgehalten wurden."
    },
    "category": "landscape",
    "url": "images/IMG_1107.PNG",
    "thumbnail": "thumbnails/IMG_1107_副本.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 1200,
    "height_px": 900
  },
  {
    "id": "p007",
    "name": {
      "en": "Natural Scenery",
      "zh": "自然风光",
      "zh-tw": "自然風光",
      "ko": "자연 경관",
      "ja": "自然の風景",
      "fr": "Paysage naturel",
      "de": "Naturlandschaft"
    },
    "description": {
      "en": "Nature photography showcasing the charm of nature.",
      "zh": "自然风光摄影作品，展现大自然的魅力。",
      "zh-tw": "自然風光攝影作品，展現大自然的魅力。",
      "ko": "자연의 매력을 보여주는 자연 사진.",
      "ja": "自然の魅力を示す自然写真。",
      "fr": "Photographie de nature mettant en valeur le charme de la nature.",
      "de": "Naturfotografie, die den Charme der Natur zur Geltung bringt."
    },
    "category": "landscape",
    "url": "images/IMG_1108.PNG",
    "thumbnail": "thumbnails/IMG_1108_副本.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 1200,
    "height_px": 900
  },
  {
    "id": "p008",
    "name": {
      "en": "Polaroid Template",
      "zh": "拍立得模板",
      "zh-tw": "拍立得模板",
      "ko": "폴라로이드 템플릿",
      "ja": "ポラロイドテンプレート",
      "fr": "Modèle Polaroid",
      "de": "Polaroid-Vorlage"
    },
    "description": {
      "en": "Classic Polaroid style frame template.",
      "zh": "经典拍立得风格相框模板。",
      "zh-tw": "經典拍立得風格相框模板。",
      "ko": "클래식 폴라로이드 스타일 프레임 템플릿.",
      "ja": "クラシックなポラロイドスタイルのフレームテンプレート。",
      "fr": "Modèle de cadre de style Polaroid classique.",
      "de": "Klassische Polaroid-Stil-Rahmenvorlage."
    },
    "category": "template",
    "url": "images/IMG_1141.PNG",
    "thumbnail": "thumbnails/IMG_1141_副本.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 850,
    "height_px": 1050
  },
  {
    "id": "p009",
    "name": {
      "en": "Creative Photography",
      "zh": "创意照片",
      "zh-tw": "創意照片",
      "ko": "창의적인 사진",
      "ja": "創造的な写真",
      "fr": "Photographie créative",
      "de": "Kreative Fotografie"
    },
    "description": {
      "en": "Creative art photography with innovative ideas.",
      "zh": "富有创意的艺术摄影作品。",
      "zh-tw": "富有創意的藝術攝影作品。",
      "ko": "혁신적인 아이디어가 담긴 창의적인 예술 사진.",
      "ja": "革新的なアイデアを持つ創造的なアート写真。",
      "fr": "Photographie d'art créative avec des idées innovantes.",
      "de": "Kreative Kunstfotografie mit innovativen Ideen."
    },
    "category": "template",
    "url": "images/IMG_1155.PNG",
    "thumbnail": "thumbnails/IMG_1155_副本.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 850,
    "height_px": 1050
  },
  {
    "id": "p010",
    "name": {
      "en": "Portrait Series 1",
      "zh": "人像系列 1",
      "zh-tw": "人像系列 1",
      "ko": "인물 시리즈 1",
      "ja": "ポートレートシリーズ 1",
      "fr": "Série Portrait 1",
      "de": "Porträtserie 1"
    },
    "description": {
      "en": "Artistic portrait with dark background and elegant styling.",
      "zh": "黑色背景下的艺术人像，造型优雅。",
      "zh-tw": "黑色背景下的藝術人像，造型優雅。",
      "ko": "어두운 배경과 우아한 스타일링의 예술적인 초상화.",
      "ja": "暗い背景とエレガントなスタイリングの芸術的なポートレート。",
      "fr": "Portrait artistique avec fond sombre et style élégant.",
      "de": "Künstlerisches Porträt mit dunklem Hintergrund und eleganter Gestaltung."
    },
    "category": CATEGORIES.PORTRAIT,  // 使用新的分类常量
    "url": "images/IMG_1121.PNG",
    "thumbnail": "thumbnails/IMG_1121.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 800,
    "height_px": 1000
  },
  {
    "id": "p011",
    "name": {
      "en": "Portrait Series 2",
      "zh": "人像系列 2",
      "zh-tw": "人像系列 2",
      "ko": "인물 시리즈 2",
      "ja": "ポートレートシリーズ 2",
      "fr": "Série Portrait 2",
      "de": "Porträtserie 2"
    },
    "description": {
      "en": "Elegant studio portrait with focused expression.",
      "zh": "专注神情的优雅工作室人像。",
      "zh-tw": "專注神情的優雅工作室人像。",
      "ko": "집중된 표정이 있는 우아한 스튜디오 초상화.",
      "ja": "集中した表情のあるエレガントなスタジオポートレート。",
      "fr": "Portrait de studio élégant avec expression concentrée.",
      "de": "Elegantes Studioporträt mit fokussiertem Ausdruck."
    },
    "category": CATEGORIES.PORTRAIT,  // 使用新的分类常量
    "url": "images/IMG_1122.PNG",
    "thumbnail": "thumbnails/IMG_1122.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 800,
    "height_px": 1000
  },
  {
    "id": "p012",
    "name": {
      "en": "Portrait Series 3",
      "zh": "人像系列 3",
      "zh-tw": "人像系列 3",
      "ko": "인물 시리즈 3",
      "ja": "ポートレートシリーズ 3",
      "fr": "Série Portrait 3",
      "de": "Porträtserie 3"
    },
    "description": {
      "en": "Dynamic portrait with professional lighting and composition.",
      "zh": "专业灯光和构图的动感人像。",
      "zh-tw": "專業燈光和構圖的動感人像。",
      "ko": "전문적인 조명과 구성의 역동적인 초상화.",
      "ja": "プロフェッショナルな照明と構図のダイナミックなポートレート。",
      "fr": "Portrait dynamique avec éclairage et composition professionnels.",
      "de": "Dynamisches Porträt mit professioneller Beleuchtung und Komposition."
    },
    "category": CATEGORIES.PORTRAIT,  // 使用新的分类常量
    "url": "images/IMG_1123.PNG",
    "thumbnail": "thumbnails/IMG_1123.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 800,
    "height_px": 1000
  },
  {
    "id": "p013",
    "name": {
      "en": "Portrait Series 4",
      "zh": "人像系列 4",
      "zh-tw": "人像系列 4",
      "ko": "인물 시리즈 4",
      "ja": "ポートレートシリーズ 4",
      "fr": "Série Portrait 4",
      "de": "Porträtserie 4"
    },
    "description": {
      "en": "Stylish portrait with sophisticated pose and lighting.",
      "zh": "精致姿态和灯光效果的时尚人像。",
      "zh-tw": "精緻姿態和燈光效果的時尚人像。",
      "ko": "세련된 포즈와 조명이 있는 스타일리시한 초상화.",
      "ja": "洗練されたポーズと照明のスタイリッシュなポートレート。",
      "fr": "Portrait élégant avec pose et éclairage sophistiqués.",
      "de": "Stilvolles Porträt mit raffinierter Pose und Beleuchtung."
    },
    "category": CATEGORIES.PORTRAIT,  // 使用新的分类常量
    "url": "images/IMG_1124.PNG",
    "thumbnail": "thumbnails/IMG_1124.PNG",
    "format": "png",
    "dpi": 300,
    "width_px": 800,
    "height_px": 1000
  }
];

// 内嵌翻译数据
const embeddedTranslations = {
  "en": {
    "title": "Photo Gallery",
    "download": "Download",
    "downloading": "Downloading...",
    "downloadError": "Download Failed",
    "downloadComplete": "Download Complete",
    "downloadProgress": "Downloading: {0}%",
    "close": "Close",
    "category": "Category",
    "all": "All Styles",
    "landscape": "Landscape",
    "portrait": "Portrait Layouts",
    "template": "Templates",
    "details": "Image Details",
    "format": "Format",
    "dimensions": "Dimensions",
    "resolution": "Resolution",
    "polaroid": "Polaroid",
    "magazine": "Magazine Covers",
    "frame": "Frames",
    "noImages": "No images found in this category"
  },
  "zh": {
    "title": "照片库",
    "download": "下载",
    "downloading": "正在下载...",
    "downloadError": "下载失败",
    "downloadComplete": "下载完成",
    "downloadProgress": "下载中: {0}%",
    "close": "关闭",
    "category": "分类",
    "all": "所有风格",
    "landscape": "风景",
    "portrait": "人物排版",
    "template": "模板",
    "details": "图片详情",
    "format": "格式",
    "dimensions": "尺寸",
    "resolution": "分辨率",
    "polaroid": "拍立得",
    "magazine": "杂志封面",
    "frame": "边框",
    "noImages": "该分类下没有图片"
  },
  "zh-tw": {
    "title": "拍立得圖庫",
    "download": "下載",
    "downloading": "正在下載...",
    "downloadError": "下載失敗",
    "downloadComplete": "下載完成",
    "downloadProgress": "下載中: {0}%",
    "close": "關閉",
    "category": "分類",
    "all": "全部圖片",
    "landscape": "風景",
    "portrait": "人像",
    "template": "模板",
    "details": "圖片詳情",
    "format": "格式",
    "dimensions": "尺寸",
    "resolution": "解析度",
    "polaroid": "拍立得",
    "magazine": "雜誌封面",
    "frame": "邊框",
    "noImages": "該分類下沒有圖片"
  },
  "ko": {
    "title": "폴라로이드 갤러리",
    "download": "다운로드",
    "downloading": "다운로드 중...",
    "downloadError": "다운로드 실패",
    "downloadComplete": "다운로드 완료",
    "downloadProgress": "다운로드 중: {0}%",
    "close": "닫기",
    "category": "카테고리",
    "all": "모든 이미지",
    "landscape": "풍경",
    "portrait": "인물",
    "template": "템플릿",
    "details": "이미지 상세정보",
    "format": "형식",
    "dimensions": "크기",
    "resolution": "해상도",
    "polaroid": "폴라로이드",
    "magazine": "매거진 커버",
    "frame": "프레임",
    "noImages": "해당 카테고리에 이미지가 없습니다"
  },
  "ja": {
    "title": "ポラロイドギャラリー",
    "download": "ダウンロード",
    "downloading": "ダウンロード中...",
    "downloadError": "ダウンロード失敗",
    "downloadComplete": "ダウンロード完了",
    "downloadProgress": "ダウンロード中: {0}%",
    "close": "閉じる",
    "category": "カテゴリー",
    "all": "すべての画像",
    "landscape": "風景",
    "portrait": "ポートレート",
    "template": "テンプレート",
    "details": "画像詳細",
    "format": "フォーマット",
    "dimensions": "サイズ",
    "resolution": "解像度",
    "polaroid": "ポラロイド",
    "magazine": "マガジンカバー",
    "frame": "フレーム",
    "noImages": "該カテゴリーに画像が見つかりません"
  },
  "fr": {
    "title": "Galerie Polaroid",
    "download": "Télécharger",
    "downloading": "Téléchargement...",
    "downloadError": "Échec du téléchargement",
    "downloadComplete": "Téléchargement terminé",
    "downloadProgress": "Téléchargement: {0}%",
    "close": "Fermer",
    "category": "Catégorie",
    "all": "Toutes les images",
    "landscape": "Paysage",
    "portrait": "Portrait",
    "template": "Modèles",
    "details": "Détails de l'image",
    "format": "Format",
    "dimensions": "Dimensions",
    "resolution": "Résolution",
    "polaroid": "Polaroid",
    "magazine": "Couvertures de Magazine",
    "frame": "Cadres",
    "noImages": "Aucune image trouvée dans cette catégorie"
  },
  "de": {
    "title": "Polaroid Galerie",
    "download": "Herunterladen",
    "downloading": "Wird heruntergeladen...",
    "downloadError": "Download fehlgeschlagen",
    "downloadComplete": "Download abgeschlossen",
    "downloadProgress": "Herunterladen: {0}%",
    "close": "Schließen",
    "category": "Kategorie",
    "all": "Alle Bilder",
    "landscape": "Landschaft",
    "portrait": "Porträt",
    "template": "Vorlagen",
    "details": "Bilddetails",
    "format": "Format",
    "dimensions": "Abmessungen",
    "resolution": "Auflösung",
    "polaroid": "Polaroid",
    "magazine": "Magazinendecke",
    "frame": "Rahmen",
    "noImages": "Keine Bilder in dieser Kategorie gefunden"
  }
};

// 设置状态消息
function setStatusMessage(message, isError = false) {
    const statusElem = document.getElementById('status-message');
    if (!statusElem) return;
    
    statusElem.textContent = message;
    statusElem.className = isError ? 'error' : 'info';
    statusElem.style.display = message ? 'block' : 'none';
}

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log("应用程序启动...");
        
        // 加载数据
        imagesData = embeddedImagesData;
        translations = embeddedTranslations;
        
        // 检查用户语言偏好
        const savedLanguage = localStorage.getItem('polaroidGalleryLanguage');
        if (savedLanguage) {
            currentLanguage = savedLanguage;
            document.getElementById('language-select').value = currentLanguage;
        } else {
            // 尝试使用浏览器语言
            const browserLang = navigator.language.split('-')[0];
            if (translations[browserLang]) {
                currentLanguage = browserLang;
                document.getElementById('language-select').value = currentLanguage;
            }
        }
        
        // 应用翻译
        applyTranslations();
        
        // 显示所有图片
        displayImages('all');
        
        // 设置事件监听器
        setupEventListeners();
        
        console.log("应用程序初始化完成");
    } catch (error) {
        console.error("初始化出错:", error);
        setStatusMessage("初始化错误: " + error.message, true);
    }
});

// 应用翻译
function applyTranslations() {
    try {
        // 获取当前语言的翻译
        const t = translations[currentLanguage] || translations.en;
        
        // 更新标题和按钮文本
        document.title = "Framoo - " + t.title;
        
        // 更新导航菜单
        document.getElementById('nav-all').textContent = t.all;
        document.getElementById('nav-polaroid').textContent = t.polaroid;
        document.getElementById('nav-magazine').textContent = t.magazine;
        document.getElementById('nav-frame').textContent = t.frame;
        document.getElementById('nav-portrait').textContent = t.portrait;
        
        // 更新模态窗口标签
        document.getElementById('label-format').textContent = t.format + ":";
        document.getElementById('label-dimensions').textContent = t.dimensions + ":";
        document.getElementById('label-resolution').textContent = t.resolution + ":";
        
        // 更新按钮文本
        document.getElementById('download-btn').textContent = t.download;
        document.getElementById('close-modal').innerHTML = '<i class="fas fa-times"></i>';
        
        // 重新显示当前分类的图片以更新翻译
        const activeButton = document.querySelector('.category-btn.active');
        const category = activeButton ? activeButton.dataset.category : 'all';
        displayImages(category);
        
        // 如果模态窗口是打开状态，更新其内容
        const modal = document.getElementById('image-modal');
        if (modal.style.display === 'block') {
            const imageId = modal.getAttribute('data-image-id');
            if (imageId) {
                const image = imagesData.find(img => img.id === imageId);
                if (image) {
                    updateModalContent(image);
                }
            }
        }
    } catch (error) {
        console.error("应用翻译出错:", error);
    }
}

// 显示图片
function displayImages(category = 'all') {
    try {
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = '';
        
        // 筛选图片
        const filteredImages = imagesData.filter(image => {
            if (category === CATEGORIES.ALL) return true;
            return image.category === category;
        });
        
        // 创建并添加图片卡片
        filteredImages.forEach(image => {
            const polaroid = document.createElement('div');
            polaroid.className = 'polaroid';
            polaroid.setAttribute('data-id', image.id);
            
            // 创建图片元素
            const img = document.createElement('img');
            img.src = image.thumbnail;
            img.alt = getLocalizedText(image.name);
            img.className = 'polaroid-image';
            
            // 处理图片加载错误
            img.onerror = function() {
                console.warn(`图片加载失败: ${image.thumbnail}`);
                this.src = 'https://via.placeholder.com/200x200?text=Image+Not+Found';
            };
            
            // 创建图片标题
            const caption = document.createElement('div');
            caption.className = 'polaroid-caption';
            
            const title = document.createElement('div');
            title.className = 'polaroid-title';
            title.textContent = getLocalizedText(image.name);
            
            const categoryText = document.createElement('div');
            categoryText.className = 'polaroid-category';
            
            // 获取分类显示文本
            const t = translations[currentLanguage] || translations.en;
            categoryText.textContent = t[image.category] || image.category;
            
            // 组装DOM元素
            caption.appendChild(title);
            caption.appendChild(categoryText);
            
            polaroid.appendChild(img);
            polaroid.appendChild(caption);
            
            // 添加点击事件
            polaroid.addEventListener('click', function() {
                openImageModal(image);
            });
            
            gallery.appendChild(polaroid);
        });
        
        // 如果没有图片，显示提示信息
        if (filteredImages.length === 0) {
            const noImages = document.createElement('div');
            noImages.className = 'no-images';
            noImages.textContent = translations[currentLanguage].noImages || 'No images found in this category';
            gallery.appendChild(noImages);
        }
    } catch (error) {
        console.error("显示图片出错:", error);
    }
}

// 获取本地化文本
function getLocalizedText(textObj) {
    if (!textObj) return '';
    
    // 如果是字符串，直接返回
    if (typeof textObj === 'string') return textObj;
    
    // 如果是对象，尝试获取当前语言
    if (typeof textObj === 'object') {
        return textObj[currentLanguage] || textObj.en || '';
    }
    
    return '';
}

// 打开图片模态窗口
function openImageModal(image) {
    try {
        // 保存当前图片ID
        const modal = document.getElementById('image-modal');
        modal.setAttribute('data-image-id', image.id);
        
        // 更新模态窗口内容
        updateModalContent(image);
        
        // 显示模态窗口
        modal.style.display = 'block';
        
        // 禁止背景滚动
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error("打开模态窗口出错:", error);
    }
}

// 更新模态窗口内容
function updateModalContent(image) {
    // 设置模态窗口内容 - 使用当前语言
    document.getElementById('modal-title').textContent = getLocalizedText(image.name);
    document.getElementById('modal-description').textContent = getLocalizedText(image.description);
    document.getElementById('modal-format').textContent = image.format.toUpperCase();
    document.getElementById('modal-dimensions').textContent = `${image.width_px} × ${image.height_px} px`;
    document.getElementById('modal-resolution').textContent = `${image.dpi} DPI`;
    
    // 设置图片并处理加载错误
    const modalImage = document.getElementById('modal-image');
    modalImage.src = image.url;
    modalImage.alt = getLocalizedText(image.name);
    modalImage.onerror = function() {
        this.src = 'https://via.placeholder.com/600x800?text=Image+Not+Found';
        console.error(`大图加载失败: ${image.url}`);
    };
    
    // 使用直接链接方式设置下载按钮
    const downloadBtn = document.getElementById('download-btn');
    const t = translations[currentLanguage] || translations.en;
    
    downloadBtn.onclick = function() {
        try {
            // 显示下载状态
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = t.downloading;
            downloadBtn.disabled = true;
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `${getLocalizedText(image.name)}.${image.format}`;
            link.target = '_blank'; // 在新标签页打开
            
            // 模拟进度反馈
            let progress = 0;
            const progressInterval = setInterval(function() {
                progress += 10;
                if (progress <= 90) {
                    downloadBtn.textContent = t.downloadProgress ? 
                        t.downloadProgress.replace('{0}', progress) : 
                        `${progress}%`;
                }
            }, 100);
            
            // 触发下载并处理完成状态
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 在"下载中"状态保持一段时间后显示"下载完成"
            setTimeout(function() {
                clearInterval(progressInterval);
                downloadBtn.textContent = t.downloadComplete || "Download Complete";
                
                // 恢复原始状态
                setTimeout(function() {
                    downloadBtn.textContent = originalText;
                    downloadBtn.disabled = false;
                }, 1500);
            }, 1500);
            
        } catch (error) {
            console.error("下载过程出错:", error);
            downloadBtn.textContent = t.downloadError || "Download Failed";
            setTimeout(function() {
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
            }, 1500);
        }
    };
}

// 关闭模态窗口
function closeModal() {
    document.getElementById('image-modal').style.display = 'none';
    
    // 恢复背景滚动
    document.body.style.overflow = 'auto';
}

// 设置事件监听器
function setupEventListeners() {
    try {
        // 分类按钮点击事件
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 更新活动按钮状态
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // 显示对应分类的图片
                const category = this.dataset.category;
                displayImages(category);
            });
        });
        
        // 关闭模态窗口事件
        document.getElementById('close-modal').addEventListener('click', closeModal);
        
        // 点击模态窗口外部关闭
        document.getElementById('image-modal').addEventListener('click', function(event) {
            if (event.target === this) {
                closeModal();
            }
        });
        
        // ESC键关闭模态窗口
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && document.getElementById('image-modal').style.display === 'block') {
                closeModal();
            }
        });
        
        // 语言切换事件
        document.getElementById('language-select').addEventListener('change', function() {
            currentLanguage = this.value;
            
            // 保存语言偏好
            localStorage.setItem('polaroidGalleryLanguage', currentLanguage);
            
            // 应用新语言
            applyTranslations();
        });
    } catch (error) {
        console.error("设置事件监听器出错:", error);
    }
}