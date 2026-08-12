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
            
            // Ẩn loading khi iframe đã tải xong
            this.iframe.addEventListener("load", () => {
                this.hideLoading();
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
        const screenScale = this.storage.getParameter("screenScale");
        this.parent.style.transform = `scale(${screenScale / 100})`;
    }

    /**
     * Thay đổi kích thước iframe dựa trên màn hình và hướng đã chọn.
     */
    resize() {
        const screenKey = this.storage.getParameter("screen");
        const screenConfig = this.screens[screenKey];
        const orientation = this.storage.getParameter("orientation");

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

// Chạy mã sau khi trang đã tải xong
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
    };

    // Lấy các phần tử DOM container
    const domElements = {
        navigation: document.getElementById("navigation-container"),
        orientation: document.getElementById("orientation-container"),
        device: document.getElementById("device-container"),
        fullVersionLink: document.getElementById("fullVersion"),
        scaleInput: document.getElementById("scale"),
    };

    // Khởi tạo các module
    const storage = new StorageManager({
        screen: "16_9",
        orientation: "l",
        screenScale: 80,
    });
    
    const navigation = new Navigation(screenDefinitions, storage);
    const orientationControl = new OrientationControl(storage);
    const device = new Device(screenDefinitions, storage, domElements.device);

    // Gắn các thành phần vào DOM
    domElements.navigation.append(navigation.element);
    domElements.orientation.append(orientationControl.element);

    // Thiết lập trạng thái ban đầu
    navigation.changeSize();
    orientationControl.change();
    device.resize();
    device.setPage();
    device.setScale();
    domElements.scaleInput.value = storage.getParameter("screenScale");
    
    // Gắn các event listener
    navigation.element.addEventListener("change", () => {
        device.resize();
    });

    orientationControl.element.addEventListener("change", () => {
        device.resize();
    });

    domElements.scaleInput.addEventListener("change", () => {
        const scaleValue = parseInt(domElements.scaleInput.value, 10);
        storage.setParameter("screenScale", scaleValue);
        device.setScale();
    });
    
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