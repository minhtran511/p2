/**
 * Quản lý danh sách game và các tính năng tìm kiếm, lọc
 * Cấu hình tab + danh sách game: config.js (APP_CONFIG)
 */
class GameListManager {
    constructor(config) {
        this.config = config;
        this.games = config.games || [];
        this.filteredGames = [...this.games];
        this.currentCategory = config.defaultCategory || 'all';
        this.currentSearch = '';

        this.elements = {
            headerTitle: document.getElementById('headerTitle'),
            headerSubtitle: document.getElementById('headerSubtitle'),
            headerStats: document.getElementById('headerStats'),
            brandLogo: document.getElementById('brandLogo'),
            favicon: document.getElementById('favicon'),
            categoryFilters: document.getElementById('categoryFilters'),
            resultCount: document.getElementById('resultCount'),
            themeToggle: document.getElementById('themeToggle'),
            gamesGrid: document.getElementById('gamesGrid'),
            loading: document.getElementById('loading'),
            noResults: document.getElementById('noResults'),
            searchInput: document.getElementById('searchInput'),
            filterBtns: []
        };

        this.init();
    }

    /**
     * Khởi tạo ứng dụng
     */
    init() {
        try {
            this.renderHeader();
            this.renderStats();
            this.renderCategoryFilters();
            this.setupEventListeners();
            this.applyFilters();
        } catch (error) {
            console.error('Lỗi khởi tạo:', error);
            this.showError();
        }
    }

    /**
     * Tổng số game / tổng số version
     */
    getTotals(games = this.games) {
        return {
            games: games.length,
            versions: games.reduce((total, game) => total + game.versions.length, 0)
        };
    }

    /**
     * Số game của một category (dùng cho hideEmptyCategories)
     */
    countByCategory(key) {
        if (key === 'all') return this.games.length;
        return this.games.filter(game => game.category === key).length;
    }

    /**
     * Lấy thông tin category từ config
     */
    getCategory(key) {
        return this.config.categories.find(category => category.key === key) || null;
    }

    getCategoryLabel(key) {
        const category = this.getCategory(key);
        return category ? category.label : key;
    }

    /**
     * Đổ tiêu đề từ config
     */
    renderHeader() {
        // Logo (base64 hoặc đường dẫn ảnh) dùng cho topbar và favicon
        const logo = this.config.logo || this.config.url;
        if (logo) {
            if (this.elements.brandLogo) {
                this.elements.brandLogo.src = logo;
                this.elements.brandLogo.hidden = false;
                this.elements.brandLogo.alt = this.config.title || '';
            }
            if (this.elements.favicon) {
                this.elements.favicon.href = logo;
            }
        }

        if (this.elements.headerTitle && this.config.title) {
            this.elements.headerTitle.textContent = this.config.title;
            document.title = `${this.config.title} - minhtq.dev`;
        }
        if (this.elements.headerSubtitle && this.config.subtitle) {
            this.elements.headerSubtitle.textContent = this.config.subtitle;
        }
    }

    /**
     * Hiển thị tổng số game và tổng số version
     */
    renderStats() {
        const statsConfig = this.config.stats || {};
        if (!this.elements.headerStats || statsConfig.enabled === false) {
            if (this.elements.headerStats) this.elements.headerStats.style.display = 'none';
            return;
        }

        const totals = this.getTotals();
        const categoryCount = this.config.categories.filter(category => category.key !== 'all').length;
        const avgVersions = totals.games ? (totals.versions / totals.games).toFixed(1) : '0';

        this.elements.headerStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">${statsConfig.gamesLabel || 'Games'}</div>
                <div class="stat-value">${totals.games}</div>
                <div class="stat-hint">across ${categoryCount} categories</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${statsConfig.versionsLabel || 'Versions'}</div>
                <div class="stat-value">${totals.versions}</div>
                <div class="stat-hint">${avgVersions} versions per game</div>
            </div>
        `;
    }

    /**
     * Dòng "Showing X of Y games"
     */
    renderResultCount() {
        if (!this.elements.resultCount) return;

        const shown = this.getTotals(this.filteredGames);
        const total = this.getTotals();

        this.elements.resultCount.textContent =
            `Showing ${shown.games} of ${total.games} games · ${shown.versions} versions`;
    }

    /**
     * Tự động sinh các tab từ config.categories
     */
    renderCategoryFilters() {
        if (!this.elements.categoryFilters) return;

        const categories = this.config.categories.filter(category => {
            if (!this.config.hideEmptyCategories) return true;
            return this.countByCategory(category.key) > 0;
        });

        // Nếu tab mặc định bị ẩn thì fallback về tab đầu tiên
        if (!categories.some(category => category.key === this.currentCategory) && categories.length > 0) {
            this.currentCategory = categories[0].key;
        }

        this.elements.categoryFilters.innerHTML = categories.map(category => {
            const isActive = category.key === this.currentCategory ? ' active' : '';
            const countHtml = this.config.showCategoryCount === false
                ? ''
                : `<span class="filter-count">${this.countByCategory(category.key)}</span>`;
            return `<button class="filter-btn${isActive}" type="button" data-category="${category.key}">${category.label}${countHtml}</button>`;
        }).join('');

        this.elements.filterBtns = this.elements.categoryFilters.querySelectorAll('.filter-btn');
    }

    /**
     * Thiết lập event listeners
     */
    setupEventListeners() {
        // Theme toggle (light / dark)
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => {
                const isDark = document.documentElement.classList.toggle('dark');
                try {
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                } catch (e) { }
            });
        }

        // Search input
        this.elements.searchInput.addEventListener('input', (e) => {
            this.currentSearch = e.target.value.toLowerCase().trim();
            this.applyFilters();
        });

        // Category filters
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.currentCategory = btn.dataset.category;
                this.applyFilters();
            });
        });
    }

    /**
     * Áp dụng bộ lọc tìm kiếm và thể loại
     */
    applyFilters() {
        let filtered = [...this.games];

        // Lọc theo thể loại
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(game => game.category === this.currentCategory);
        }

        // Lọc theo tìm kiếm
        if (this.currentSearch) {
            filtered = filtered.filter(game =>
                game.name.toLowerCase().includes(this.currentSearch) ||
                game.category.toLowerCase().includes(this.currentSearch) ||
                this.getCategoryLabel(game.category).toLowerCase().includes(this.currentSearch)
            );
        }

        this.filteredGames = filtered;
        this.renderGames();
    }

    /**
     * Render danh sách game
     */
    renderGames() {
        this.elements.loading.style.display = 'none';
        this.renderResultCount();

        if (this.filteredGames.length === 0) {
            this.elements.gamesGrid.style.display = 'none';
            this.elements.noResults.style.display = 'block';
            return;
        }

        this.elements.noResults.style.display = 'none';
        this.elements.gamesGrid.style.display = 'grid';

        this.elements.gamesGrid.innerHTML = this.filteredGames.map(game =>
            this.createGameCard(game)
        ).join('');

        // Thêm event listeners cho version items
        this.setupVersionClickHandlers();
    }

    /**
     * Tạo card cho một game
     */
    createGameCard(game) {
        const paths = this.config.paths || {};
        const devicePrefix = paths.devicePrefix || './device/?page=../playable/category';
        const directPrefix = paths.directPrefix || './playable/category';

        const versionsHtml = game.versions.map(version => {
            const deviceUrl = `${devicePrefix}/${game.folder}/${version}.html`;
            const directUrl = `${directPrefix}/${game.folder}/${version}.html`;
            return `<div class="version-item" data-device="${deviceUrl}" data-direct="${directUrl}">${version}</div>`;
        }).join('');

        return `
            <div class="game-card" data-category="${game.category}">
                <div class="game-header">
                    <h3>${game.name}</h3>
                    <span class="game-category">${this.getCategoryLabel(game.category)}</span>
                </div>
                <div class="game-versions">
                    ${versionsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Thiết lập event handlers cho version items
     */
    setupVersionClickHandlers() {
        const versionItems = document.querySelectorAll('.version-item');

        versionItems.forEach(item => {
            item.addEventListener('click', () => {
                const deviceUrl = item.dataset.device;
                const directUrl = item.dataset.direct;

                // Phát hiện mobile device
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                // Mobile mở game trực tiếp, desktop mở luôn trình giả lập device
                window.open(isMobile ? directUrl : deviceUrl, '_blank');
            });
        });
    }

    /**
     * Hiển thị thông báo lỗi
     */
    showError() {
        this.elements.loading.innerHTML = `
            <h3>Something went wrong</h3>
            <p>Unable to load game library. Please try again later.</p>
        `;
    }
}

// Khởi tạo ứng dụng khi trang đã load xong
document.addEventListener('DOMContentLoaded', () => {
    new GameListManager(APP_CONFIG);
});
