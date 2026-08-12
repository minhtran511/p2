/**
 * Lớp quản lý việc lưu trữ và truy xuất các cài đặt từ localStorage.
 * Có giá trị mặc định nếu không tìm thấy trong storage.
 */
class StorageManager {
    constructor(defaultSettings) {
        this.storage = {};
        this.defaultSettings = defaultSettings || {};
    }

    /**
     * Thiết lập một giá trị vào storage và localStorage.
     * @param {string} key - Khóa của tham số.
     * @param {string} value - Giá trị của tham số.
     */
    setParameter(key, value) {
        this.storage[key] = value;
        if (localStorage) {
            localStorage.setItem(key, value);
        }
    }

    /**
     * Lấy một giá trị từ storage, localStorage hoặc giá trị mặc định.
     * @param {string} key - Khóa của tham số.
     * @returns {string} Giá trị của tham số.
     */
    getParameter(key) {
        if (this.storage[key] !== undefined) {
            return this.storage[key];
        }
        if (localStorage && localStorage[key]) {
            return localStorage[key];
        }
        if (this.defaultSettings[key] !== undefined) {
            return this.defaultSettings[key];
        }
        return "";
    }
}

/**
 * Lớp quản lý giao diện thiết bị mô phỏng, bao gồm iframe và việc thay đổi kích thước.
 */
class Device {
    constructor(screens, storage, parentElement) {
        this.screens = screens;
        this.storage = storage;
        this.body = document.querySelector("body");
        this.parent = parentElement;

        this.element = document.createElement("section");
        this.element.id = "device";

        this.screen = document.createElement("section");
        this.screen.id = "screen";
        this.element.append(this.screen);

        this.label = document.createElement("span");
        this.label.className = "label";
        this.screen.append(this.label);

        this.iframe = document.createElement("iframe");
        this.iframe.id = "iframe";
        this.iframe.setAttribute("allow", "autoplay");
        this.screen.append(this.iframe);

        // Phần khoét màn hình (tai thỏ / viên thuốc / nốt ruồi)
        this.cutout = document.createElement("span");
        this.cutout.className = "cutout";
        this.screen.append(this.cutout);
        
        // Loading overlay elements
        this.loadingOverlay = document.getElementById("loading-overlay");

        this.parent.append(this.element);
    }

    /**
     * Lấy URL của trang từ query params và thiết lập nó cho iframe.
     */
    setPage() {
        const pageUrl = this.getPage();
        if (pageUrl) {
            this.showLoading();
            this.iframe.setAttribute("src", pageUrl);
            this.watchFrame();

            // Ẩn loading khi iframe đã tải xong
            this.iframe.addEventListener("load", () => {
                this.hideLoading();
                this.watchFrame();
            });
            
            // Ẩn loading nếu có lỗi
            this.iframe.addEventListener("error", () => {
                this.hideLoading();
            });
        }
        this.body.classList.remove("no-page");
        this.body.classList.add("_show-all");
    }

    /**
     * Phân tích URL hiện tại để lấy tham số 'page'.
     * Tham số được cất vào sessionStorage rồi xoá khỏi thanh địa chỉ,
     * nên URL hiển thị chỉ còn `/device/` (F5 vẫn giữ nguyên game đang xem).
     * @returns {string} URL của trang để tải trong iframe.
     */
    getPage() {
        const searchParams = new URLSearchParams(window.location.search);
        let page = searchParams.get("page");
        let lang = searchParams.get("lang");

        if (page) {
            // Lần đầu vào trang: nhớ tham số rồi dọn URL
            try {
                sessionStorage.setItem("devicePage", page);
                if (lang) {
                    sessionStorage.setItem("deviceLang", lang);
                } else {
                    sessionStorage.removeItem("deviceLang");
                }
            } catch (e) { }
            window.history.replaceState({}, "", window.location.pathname);
        } else {
            // URL đã được dọn (hoặc user F5): lấy lại tham số đã nhớ
            try {
                page = sessionStorage.getItem("devicePage");
                lang = sessionStorage.getItem("deviceLang");
            } catch (e) { }
        }

        // Cung cấp trang mặc định khi chạy trên localhost
        if (!page && window.location.host.includes("localhost")) {
            page = "index.html";
        }

        if (page) {
            const hash = Math.floor(Math.random() * 10000);
            let url = `${page}?hash=${hash}`;
            if (lang) {
                url = `${url}&lang=${lang}`;
            }
            return url;
        }

        return "";
    }

    /**
     * Thiết lập tỷ lệ phóng to/thu nhỏ cho container của thiết bị.
     */
    setScale() {
        // Kẹp lại phòng khi localStorage còn giá trị cũ ngoài dải cho phép
        const screenScale = Math.min(200, Math.max(40, parseInt(this.storage.getParameter("screenScale"), 10) || 80));
        this.parent.style.transform = `scale(${screenScale / 100})`;
        return screenScale;
    }

    /**
     * Thay đổi kích thước iframe dựa trên màn hình và hướng đã chọn.
     */
    resize() {
        const screenKey = this.storage.getParameter("screen");
        const screenConfig = this.screens[screenKey];
        const orientation = this.storage.getParameter("orientation");

        // Tỷ lệ tuỳ chỉnh: quy về cạnh dài / cạnh ngắn rồi dùng chung logic bên dưới,
        // nhờ vậy vẫn đổi được dọc/ngang và không bao giờ tràn khung
        if (screenConfig.isCustom) {
            const ratioW = Device.clampRatio(this.storage.getParameter("customRatioW"), 16);
            const ratioH = Device.clampRatio(this.storage.getParameter("customRatioH"), 9);
            const ratio = Math.max(ratioW, ratioH) / Math.min(ratioW, ratioH);

            // Chặn tỷ lệ quá dài (vd 50:1) làm khung dài vô tội vạ
            screenConfig.ratio = Math.min(3, ratio);
        }

        const baseWidth = screenConfig.ratio < 1.8 ? 320 : 375;
        this.body.classList.toggle("bigscreen", screenConfig.ratio >= 2);

        let height, width;
        if (orientation === "p") { // Portrait
            height = Math.floor(baseWidth * screenConfig.ratio);
            width = baseWidth;
        } else { // Landscape
            width = Math.round(baseWidth * screenConfig.ratio);
            height = baseWidth;
        }

        this.iframe.style.width = `${width}px`;
        this.iframe.style.height = `${height}px`;
    }
    
    /**
     * @returns {Window|null} window bên trong iframe (null nếu không truy cập được).
     */
    getFrameWindow() {
        try {
            return this.iframe.contentWindow;
        } catch (e) {
            return null;
        }
    }

    /**
     * Báo cho bên ngoài mỗi khi iframe có document mới, để cài cầu nối âm thanh
     * càng sớm càng tốt (trước khi game kịp khởi tạo AudioContext).
     */
    watchFrame() {
        if (typeof this.onFrameReady !== "function") {
            return;
        }
        if (this.frameWatcher) {
            clearInterval(this.frameWatcher);
        }

        this.onFrameReady();
        // Dò dày trong 5s đầu để chen vào trước lúc game khởi tạo audio/canvas
        this.frameWatcher = setInterval(() => this.onFrameReady(), 16);
        setTimeout(() => {
            clearInterval(this.frameWatcher);
            // Sau đó dò thưa, để bắt iframe con hoặc audio sinh muộn
            this.frameWatcher = setInterval(() => this.onFrameReady(), 1000);
        }, 5000);
    }

    /**
     * Giới hạn một vế của tỷ lệ tuỳ chỉnh trong khoảng hợp lệ.
     * @param {string|number} value - Giá trị người dùng nhập.
     * @param {number} fallback - Giá trị dùng khi nhập sai/để trống.
     * @returns {number} Một vế của tỷ lệ.
     */
    static clampRatio(value, fallback) {
        const ratio = parseFloat(value);
        if (isNaN(ratio) || ratio <= 0) {
            return fallback;
        }
        return Math.min(32, Math.max(1, Math.round(ratio * 10) / 10));
    }

    /**
     * Hiển thị loading overlay
     */
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add("show");
        }
    }
    
    /**
     * Ẩn loading overlay
     */
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove("show");
        }
    }
}

/**
 * Lớp tạo và quản lý thanh điều hướng để chọn kích thước màn hình.
 */
class Navigation {
    constructor(screens, storage) {
        this.storage = storage;
        this.element = document.createElement("nav");
        this.element.id = "navigation";
        this.items = [];

        for (const key in screens) {
            const item = this.createItem(key, screens[key]);
            this.items.push(item);
            this.element.append(item);
        }

        this.initEvents();
    }

    /**
     * Đánh dấu mục đang hoạt động trong thanh điều hướng.
     * @param {string} key - Khóa của kích thước màn hình.
     */
    setActiveItem(key) {
        this.items.forEach(item => {
            item.classList.toggle("_active", item.getAttribute("key") === key);
        });
        this.activeKey = key;
    }

    /**
     * Thay đổi kích thước màn hình hiện tại.
     * @param {string} [screenKey] - Khóa của kích thước màn hình.
     */
    changeSize(screenKey) {
        const key = screenKey || this.storage.getParameter("screen");
        this.setActiveItem(key);
        this.storage.setParameter("screen", key);
        this.element.dispatchEvent(new Event("change"));
    }

    /**
     * Khởi tạo các sự kiện click cho thanh điều hướng.
     */
    initEvents() {
        let isLocked = false;
        this.element.addEventListener("click", (event) => {
            event.preventDefault();
            const navItem = event.target.closest(".navigation-ratio");
            if (navItem && !navItem.classList.contains("_active") && !isLocked) {
                isLocked = true;
                this.changeSize(navItem.getAttribute("key"));
                isLocked = false;
            }
        });
    }

    /**
     * Tạo một mục điều hướng.
     * @param {string} key - Khóa của màn hình.
     * @param {object} screenData - Dữ liệu của màn hình.
     * @returns {HTMLElement} - Phần tử mục điều hướng.
     */
    createItem(key, screenData) {
        const item = document.createElement("div");
        item.className = "navigation-item navigation-ratio";
        item.setAttribute("key", key);

        const title = document.createElement("span");
        title.className = "navigation-title";
        title.textContent = screenData.title;
        item.append(title);

        const code = document.createElement("span");
        code.className = "navigation-code";
        code.textContent = screenData.code;
        item.append(code);

        return item;
    }
}

/**
 * Lớp quản lý nút chuyển đổi hướng (dọc/ngang).
 */
class OrientationControl {
    constructor(storage) {
        this.storage = storage;
        this.body = document.querySelector("body");

        this.element = document.createElement("div");
        this.element.id = "orientation";
        this.element.className = "navigation-item";

        const portraitIcon = document.createElement("div");
        portraitIcon.className = "portrait-icon";

        const landscapeIcon = document.createElement("div");
        landscapeIcon.className = "landscape-icon";

        this.element.append(portraitIcon, landscapeIcon);
        this.initEvents();
    }

    /**
     * Thay đổi hướng và cập nhật class trên body.
     * @param {string} [orientation] - 'p' cho dọc, 'l' cho ngang.
     */
    change(orientation) {
        const newOrientation = orientation || this.storage.getParameter("orientation");
        this.storage.setParameter("orientation", newOrientation);

        if (newOrientation === "p") {
            this.body.classList.remove("orientation-l");
            this.body.classList.add("orientation-p");
        } else {
            this.body.classList.remove("orientation-p");
            this.body.classList.add("orientation-l");
        }

        this.element.dispatchEvent(new Event("change"));
    }

    /**
     * Khởi tạo sự kiện click để chuyển đổi hướng.
     */
    initEvents() {
        this.element.addEventListener("click", (event) => {
            event.preventDefault();
            const currentOrientation = this.storage.getParameter("orientation");
            this.change(currentOrientation === "p" ? "l" : "p");
        });
    }
}

/**
 * Lớp quản lý chế độ toàn màn hình: iframe tràn kín vùng nhìn thấy của trang
 * (không dùng fullscreen F11 của trình duyệt), chỉ còn một nút thu nhỏ nổi phía trên.
 */
class FullscreenControl {
    constructor(enterButton, exitButton, muteButton) {
        this.body = document.querySelector("body");
        this.enterButton = enterButton;
        this.exitButton = exitButton;
        this.muteButton = muteButton;
        this.muteHome = muteButton ? muteButton.parentElement : null;
        this.initEvents();
    }

    get isActive() {
        return this.body.classList.contains("fullscreen-mode");
    }

    enter() {
        this.body.classList.add("fullscreen-mode");
        // Bảng điều khiển bị ẩn, nhưng vẫn cần nút tiếng -> đưa lên thanh nổi cạnh nút thu nhỏ
        const bar = document.getElementById("fs-controls");
        if (this.muteButton && bar) {
            bar.insertBefore(this.muteButton, this.exitButton);
        }
    }

    exit() {
        this.body.classList.remove("fullscreen-mode");
        if (this.muteButton && this.muteHome) {
            this.muteHome.insertBefore(this.muteButton, this.enterButton);
        }
    }

    toggle() {
        if (this.isActive) {
            this.exit();
        } else {
            this.enter();
        }
    }

    initEvents() {
        if (this.enterButton) {
            this.enterButton.addEventListener("click", () => this.enter());
        }
        if (this.exitButton) {
            this.exitButton.addEventListener("click", () => this.exit());
        }

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isActive) {
                this.exit();
            }
        });
    }
}

/**
 * Lớp quản lý kiểu khoét màn hình: thường / tai thỏ / viên thuốc / nốt ruồi.
 */
class DeviceStyleControl {
    constructor(element, storage) {
        this.element = element;
        this.storage = storage;
        this.body = document.querySelector("body");
        this.styles = DeviceStyleControl.STYLES;

        this.render();
        this.apply(this.storage.getParameter("deviceStyle"));
        this.initEvents();
    }

    /**
     * Sinh các nút chọn từ bảng định nghĩa.
     */
    render() {
        if (!this.element) {
            return;
        }
        this.element.innerHTML = this.styles.map((style) => `
            <div class="navigation-item navigation-style" key="${style.key}" title="${style.title}">
                <span class="style-preview"></span>
            </div>
        `).join("");
    }

    /**
     * @param {string} style - Khóa kiểu khoét màn hình.
     */
    apply(style) {
        const found = this.styles.find((item) => item.key === style) || this.styles[0];

        this.styles.forEach((item) => {
            this.body.classList.toggle(`device-style-${item.key}`, item === found);
        });
        // Vị trí phần khoét so với cạnh máy: giữa / lệch trái / lệch phải
        ["center", "start", "end"].forEach((align) => {
            this.body.classList.toggle(`cut-align-${align}`, align === found.align);
        });
        this.body.classList.toggle("has-cutout", Boolean(found.align));
        this.storage.setParameter("deviceStyle", found.key);

        if (this.element) {
            this.element.querySelectorAll(".navigation-style").forEach((item) => {
                item.classList.toggle("_active", item.getAttribute("key") === found.key);
            });
        }
    }

    initEvents() {
        if (!this.element) {
            return;
        }
        this.element.addEventListener("click", (event) => {
            const item = event.target.closest(".navigation-style");
            if (item) {
                event.preventDefault();
                this.apply(item.getAttribute("key"));
            }
        });
    }
}

/**
 * Bảng các kiểu khoét màn hình.
 * - key: dùng cho class `device-style-<key>` bên CSS
 * - align: vị trí so với cạnh máy (center/start/end); không có = màn phẳng
 */
DeviceStyleControl.STYLES = [
    { key: "none", title: "Standard" },
    { key: "wide-notch", title: "Wide notch", align: "center" },
    { key: "notch", title: "Notch", align: "center" },
    { key: "teardrop", title: "Teardrop", align: "center" },
    { key: "island", title: "Dynamic Island", align: "center" },
    { key: "punch", title: "Punch hole", align: "center" },
    { key: "punch-left", title: "Punch hole left", align: "start" },
    { key: "punch-right", title: "Punch hole right", align: "end" },
    { key: "pill-left", title: "Pill left", align: "start" },
    { key: "pill-right", title: "Pill right", align: "end" },
];

/**
 * Lớp quản lý nút xoay máy 180°: chỉ đổi bên đặt tai thỏ/khoét màn hình,
 * khung máy và kích thước game giữ nguyên.
 */
class RotateControl {
    constructor(button, storage) {
        this.button = button;
        this.storage = storage;
        this.body = document.querySelector("body");

        this.apply(this.storage.getParameter("rotated") === "true");
        this.initEvents();
    }

    /**
     * @param {boolean} rotated - Có xoay 180° hay không.
     */
    apply(rotated) {
        this.body.classList.toggle("rotated", rotated);
        this.storage.setParameter("rotated", rotated);

        if (this.button) {
            this.button.classList.toggle("_active", rotated);
        }
    }

    initEvents() {
        if (this.button) {
            this.button.addEventListener("click", () => {
                this.apply(!this.body.classList.contains("rotated"));
            });
        }
    }
}

/**
 * Cầu nối âm thanh: cài vào window của iframe để tắt/bật được cả
 * thẻ <audio>/<video> lẫn Web Audio (loại mà game thường dùng).
 * @param {Window} win - window của iframe (cùng origin).
 */
function injectAudioBridge(win) {
    if (!win || win.__deviceAudioPatched) {
        return;
    }
    win.__deviceAudioPatched = true;

    const contexts = [];
    let muted = false;

    const remember = (context) => {
        if (!context || contexts.indexOf(context) !== -1) {
            return;
        }
        contexts.push(context);
        if (muted && context.suspend) {
            try {
                context.suspend();
            } catch (e) { }
        }
    };

    ["AudioContext", "webkitAudioContext"].forEach((name) => {
        const Original = win[name];
        if (!Original) {
            return;
        }

        // 1. Context tạo sau khi cầu nối được cài
        const Patched = function (...args) {
            const context = new Original(...args);
            remember(context);
            return context;
        };
        Patched.prototype = Original.prototype;
        win[name] = Patched;

        // 2. Game tự gọi resume() (thường trong sự kiện chạm) sẽ mở tiếng trở lại
        //    -> chặn khi đang tắt tiếng
        const originalResume = Original.prototype.resume;
        if (originalResume && !Original.prototype.__deviceResumePatched) {
            Original.prototype.__deviceResumePatched = true;
            Original.prototype.resume = function () {
                remember(this);
                if (muted) {
                    return win.Promise ? win.Promise.resolve() : undefined;
                }
                return originalResume.apply(this, arguments);
            };
        }
    });

    // 3. Context tạo TRƯỚC khi cầu nối kịp cài (game khởi tạo audio rất sớm):
    //    mọi node đều phải connect() nên bắt ở đây là tóm được context đang dùng
    const AudioNode = win.AudioNode;
    if (AudioNode && !AudioNode.prototype.__deviceConnectPatched) {
        AudioNode.prototype.__deviceConnectPatched = true;
        const originalConnect = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function () {
            remember(this.context);
            return originalConnect.apply(this, arguments);
        };
    }

    // 4. Thẻ <audio>/<video>: chặn cả play() lẫn việc game tự set muted = false
    const media = win.HTMLMediaElement;
    if (media && !media.prototype.__devicePlayPatched) {
        media.prototype.__devicePlayPatched = true;

        const originalPlay = media.prototype.play;
        media.prototype.play = function () {
            if (muted) {
                this.muted = true;
            }
            return originalPlay.apply(this, arguments);
        };

        const descriptor = Object.getOwnPropertyDescriptor(media.prototype, "muted");
        if (descriptor && descriptor.get && descriptor.set) {
            Object.defineProperty(media.prototype, "muted", {
                configurable: true,
                get: descriptor.get,
                set(value) {
                    descriptor.set.call(this, muted ? true : value);
                }
            });
        }
    }

    win.__deviceAudio = {
        set(value) {
            muted = value;

            contexts.forEach((context) => {
                try {
                    if (value) {
                        context.suspend();
                    } else if (context.state === "suspended") {
                        context.resume();
                    }
                } catch (e) { }
            });

            try {
                win.document.querySelectorAll("audio, video").forEach((element) => {
                    element.muted = value;
                });
            } catch (e) { }
        },

        /**
         * Ảnh chụp trạng thái âm thanh, dùng để kiểm tra nhanh khi debug.
         */
        report() {
            let media = [];
            try {
                media = Array.from(win.document.querySelectorAll("audio, video")).map((el) => el.muted);
            } catch (e) { }
            return {
                muted,
                contexts: contexts.map((context) => context.state),
                media
            };
        }
    };
}

/**
 * Nâng độ phân giải vẽ của game: báo devicePixelRatio cao hơn để engine
 * (Phaser/Pixi/Cocos/Unity...) dựng canvas với backing store lớn hơn.
 * Nhờ vậy phóng to khung máy vẫn nét thay vì bị kéo giãn ảnh.
 * Phải cài trước khi game khởi tạo canvas nên mới cần watchFrame dò liên tục.
 * @param {Window} win - window của iframe (cùng origin).
 * @param {number} ratio - tỷ lệ vẽ mong muốn.
 */
function injectPixelRatio(win, ratio) {
    if (!win || win.__devicePixelRatioPatched) {
        return;
    }
    try {
        Object.defineProperty(win, "devicePixelRatio", {
            configurable: true,
            get: () => ratio
        });
        win.__devicePixelRatioPatched = true;
    } catch (e) { }
}

/**
 * Lớp quản lý nút tắt/bật âm thanh của game trong iframe.
 */
class AudioControl {
    constructor(button, device, storage) {
        this.button = button;
        this.device = device;
        this.storage = storage;
        this.muted = this.storage.getParameter("muted") === "true";

        this.device.onFrameReady = () => this.apply();
        this.device.watchFrame();
        this.updateButton();
        this.initEvents();
    }

    /**
     * Đẩy trạng thái tắt/bật tiếng vào iframe.
     */
    apply() {
        this.applyTo(this.device.getFrameWindow(), 0);
    }

    /**
     * Cài cầu nối cho một window rồi đệ quy xuống các iframe con
     * (nhiều playable nhét game trong iframe lồng thêm một tầng).
     * @param {Window} win - window cần xử lý.
     * @param {number} depth - độ sâu hiện tại, chặn ở 3 tầng cho an toàn.
     */
    applyTo(win, depth) {
        if (!win || depth > 3) {
            return;
        }
        try {
            injectAudioBridge(win);
            injectPixelRatio(win, AudioControl.RENDER_SCALE);

            if (win.__deviceAudio && win.__deviceAudioState !== this.muted) {
                win.__deviceAudio.set(this.muted);
                win.__deviceAudioState = this.muted;
            }

            for (let i = 0; i < win.frames.length; i++) {
                this.applyTo(win.frames[i], depth + 1);
            }
        } catch (e) { }
    }

    toggle() {
        this.muted = !this.muted;
        this.storage.setParameter("muted", this.muted);
        this.updateButton();
        this.apply();
    }

    updateButton() {
        if (!this.button) {
            return;
        }
        this.button.classList.toggle("_muted", this.muted);
        this.button.title = this.muted ? "Unmute" : "Mute";
    }

    initEvents() {
        if (this.button) {
            this.button.addEventListener("click", () => this.toggle());
        }
    }
}

// Chạy mã sau khi trang đã tải xong
// Độ phân giải vẽ ép cho game, để phóng to khung máy vẫn nét
AudioControl.RENDER_SCALE = 2;

window.addEventListener("load", () => {
    // Định nghĩa các loại màn hình
    const screenDefinitions = {
        "4_3": { title: "4:3", code: "emn", ratio: 4 / 3 },
        "3_2": { title: "3:2", code: "mn", ratio: 1.5 },
        "16_10": { title: "16:10", code: "xsm", ratio: 1.6 },
        "5_3": { title: "5:3", code: "sm", ratio: 5 / 3 },
        "16_9": { title: "16:9", code: "md", ratio: 16 / 9 },
        "16_8": { title: "16:8", code: "lg", ratio: 2 },
        "X": { title: "19.5:9", code: "xlg", ratio: 19.5 / 9 },
        "custom": { title: "Custom", code: "cst", ratio: 1, isCustom: true },
    };

    // Lấy các phần tử DOM container
    const domElements = {
        navigation: document.getElementById("navigation-container"),
        orientation: document.getElementById("orientation-container"),
        device: document.getElementById("device-container"),
        fullVersionLink: document.getElementById("fullVersion"),
        scaleInput: document.getElementById("scale"),
        zoomValue: document.getElementById("zoomValue"),
        customRatioW: document.getElementById("customRatioW"),
        customRatioH: document.getElementById("customRatioH"),
        deviceStyle: document.getElementById("device-style"),
        rotateBtn: document.getElementById("rotateBtn"),
        fullscreenBtn: document.getElementById("fullscreenBtn"),
        exitFullscreenBtn: document.getElementById("exitFullscreen"),
        muteBtn: document.getElementById("muteBtn"),
    };

    // Khởi tạo các module
    const storage = new StorageManager({
        screen: "16_9",
        orientation: "l",
        screenScale: 80,
        customRatioW: 16,
        customRatioH: 9,
        deviceStyle: "none",
        rotated: false,
    });
    
    const navigation = new Navigation(screenDefinitions, storage);
    const orientationControl = new OrientationControl(storage);
    const device = new Device(screenDefinitions, storage, domElements.device);

    // Gắn các thành phần vào DOM
    domElements.navigation.append(navigation.element);
    domElements.orientation.append(orientationControl.element);
    // Nút xoay đứng sau nút đổi hướng
    domElements.orientation.append(domElements.rotateBtn);

    // Thiết lập trạng thái ban đầu
    navigation.changeSize();
    orientationControl.change();
    device.resize();
    device.setPage();
    device.setScale();
    domElements.scaleInput.value = storage.getParameter("screenScale");

    // Chế độ toàn màn hình + tắt/bật âm thanh + kiểu khoét màn hình
    new FullscreenControl(domElements.fullscreenBtn, domElements.exitFullscreenBtn, domElements.muteBtn);
    new AudioControl(domElements.muteBtn, device, storage);
    new DeviceStyleControl(domElements.deviceStyle, storage);
    new RotateControl(domElements.rotateBtn, storage);

    // Tỷ lệ tuỳ chỉnh: đổ giá trị đã lưu và chỉ hiện ô nhập khi tab Custom đang chọn
    const syncCustomPanel = () => {
        document.body.classList.toggle("custom-active", storage.getParameter("screen") === "custom");
    };
    domElements.customRatioW.value = Device.clampRatio(storage.getParameter("customRatioW"), 16);
    domElements.customRatioH.value = Device.clampRatio(storage.getParameter("customRatioH"), 9);
    syncCustomPanel();

    const applyCustomRatio = () => {
        const ratioW = Device.clampRatio(domElements.customRatioW.value, 16);
        const ratioH = Device.clampRatio(domElements.customRatioH.value, 9);

        domElements.customRatioW.value = ratioW;
        domElements.customRatioH.value = ratioH;
        storage.setParameter("customRatioW", ratioW);
        storage.setParameter("customRatioH", ratioH);
        device.resize();
    };

    [domElements.customRatioW, domElements.customRatioH].forEach(input => {
        input.addEventListener("change", applyCustomRatio);
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                input.blur();
            }
        });
    });

    // Gắn các event listener
    navigation.element.addEventListener("change", () => {
        syncCustomPanel();
        device.resize();
    });

    orientationControl.element.addEventListener("change", () => {
        device.resize();
    });

    const applyScale = () => {
        const scaleValue = Math.min(200, Math.max(40, parseInt(domElements.scaleInput.value, 10) || 80));
        domElements.scaleInput.value = scaleValue;
        storage.setParameter("screenScale", scaleValue);
        device.setScale();
        if (domElements.zoomValue) {
            domElements.zoomValue.textContent = `${scaleValue}%`;
        }
    };
    // input: kéo tới đâu phóng tới đó, không phải thả chuột mới đổi
    domElements.scaleInput.addEventListener("input", applyScale);
    applyScale();
    
    // Thêm loading khi click restart
    const restartBtn = document.querySelector(".navigation-restart");
    if (restartBtn) {
        restartBtn.addEventListener("click", (e) => {
            const currentSrc = device.iframe.src;
            if (currentSrc) {
                e.preventDefault();
                device.showLoading();
                
                // Reload iframe
                device.iframe.src = "";
                setTimeout(() => {
                    device.iframe.src = currentSrc;
                    device.watchFrame();
                }, 100);
            }
        });
    }
    
    // Hiển thị link "Full Version" trên thiết bị di động
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod|Android/.test(userAgent) && !window.MSStream) {
        domElements.fullVersionLink.href = device.getPage();
        domElements.fullVersionLink.classList.add("_visible");
    }
});