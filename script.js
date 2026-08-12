/**
 * Left-hand game list: search, filter, and load a build into the device frame.
 * Game/tab configuration: config.js (APP_CONFIG)
 * Device engine: device/main.js (window.deviceApi)
 */
class GameListManager {
    constructor(config) {
        this.config = config;
        this.games = config.games || [];
        this.filteredGames = [...this.games];
        this.currentCategory = config.defaultCategory || 'all';
        this.currentSearch = '';
        this.currentVersionKey = '';

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
            noResults: document.getElementById('noResults'),
            searchInput: document.getElementById('searchInput'),
            stageEmpty: document.getElementById('stageEmpty'),
            filterBtns: []
        };

        this.init();
    }

    init() {
        this.renderHeader();
        this.renderStats();
        this.renderCategoryFilters();
        this.setupEventListeners();
        this.applyFilters();
    }

    /* ------------------------------------------------------------------ *
     * Header
     * ------------------------------------------------------------------ */
    renderHeader() {
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

    getTotals(games = this.games) {
        return {
            games: games.length,
            versions: games.reduce((total, game) => total + game.versions.length, 0)
        };
    }

    renderStats() {
        const statsConfig = this.config.stats || {};
        if (!this.elements.headerStats || statsConfig.enabled === false) {
            if (this.elements.headerStats) this.elements.headerStats.style.display = 'none';
            return;
        }

        const totals = this.getTotals();
        this.elements.headerStats.innerHTML = `
            <div class="stat-chip">
                <span class="stat-value">${totals.games}</span>
                <span class="stat-label">${statsConfig.gamesLabel || 'Games'}</span>
            </div>
            <div class="stat-chip">
                <span class="stat-value">${totals.versions}</span>
                <span class="stat-label">${statsConfig.versionsLabel || 'Versions'}</span>
            </div>
        `;
    }

    /* ------------------------------------------------------------------ *
     * Filters
     * ------------------------------------------------------------------ */
    countByCategory(key) {
        if (key === 'all') return this.games.length;
        return this.games.filter(game => game.category === key).length;
    }

    getCategory(key) {
        return this.config.categories.find(category => category.key === key) || null;
    }

    getCategoryLabel(key) {
        const category = this.getCategory(key);
        return category ? category.label : key;
    }

    renderCategoryFilters() {
        if (!this.elements.categoryFilters) return;

        const categories = this.config.categories.filter(category => {
            if (!this.config.hideEmptyCategories) return true;
            return this.countByCategory(category.key) > 0;
        });

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

    setupEventListeners() {
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => {
                const isDark = document.documentElement.classList.toggle('dark');
                try {
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                } catch (e) { }
            });
        }

        this.elements.searchInput.addEventListener('input', (e) => {
            this.currentSearch = e.target.value.toLowerCase().trim();
            this.applyFilters();
        });

        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.currentCategory = btn.dataset.category;
                this.applyFilters();
            });
        });

        // Clicking a version loads it straight into the device frame
        this.elements.gamesGrid.addEventListener('click', (event) => {
            const item = event.target.closest('.version-item');
            if (item) {
                this.playVersion(item.dataset.path, item.dataset.key);
            }
        });
    }

    applyFilters() {
        let filtered = [...this.games];

        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(game => game.category === this.currentCategory);
        }

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

    renderResultCount() {
        if (!this.elements.resultCount) return;

        const shown = this.getTotals(this.filteredGames);
        const total = this.getTotals();
        this.elements.resultCount.textContent =
            `${shown.games}/${total.games} games · ${shown.versions} versions`;
    }

    /* ------------------------------------------------------------------ *
     * Game list
     * ------------------------------------------------------------------ */
    renderGames() {
        this.renderResultCount();

        if (this.filteredGames.length === 0) {
            this.elements.gamesGrid.style.display = 'none';
            this.elements.noResults.style.display = 'block';
            return;
        }

        this.elements.noResults.style.display = 'none';
        this.elements.gamesGrid.style.display = 'block';
        this.elements.gamesGrid.innerHTML = this.filteredGames.map(game =>
            this.createGameCard(game)
        ).join('');

        this.markActiveVersion();
    }

    createGameCard(game) {
        const base = (this.config.paths && this.config.paths.directPrefix) || './playable/category';

        const versionsHtml = game.versions.map(version => {
            const path = `${base}/${game.folder}/${version}.html`;
            const key = `${game.folder}/${version}`;
            return `<button class="version-item" type="button" data-path="${path}" data-key="${key}">${version}</button>`;
        }).join('');

        return `
            <article class="game-card" data-category="${game.category}">
                <div class="game-header">
                    <h3>${game.name}</h3>
                    <span class="game-category">${this.getCategoryLabel(game.category)}</span>
                </div>
                <div class="game-versions">
                    ${versionsHtml}
                </div>
            </article>
        `;
    }

    /* ------------------------------------------------------------------ *
     * Loading a build into the device
     * ------------------------------------------------------------------ */
    /**
     * Phones only get the list: a tap opens the build in a new tab, because a
     * simulated device inside a phone screen is useless.
     */
    isMobile() {
        return window.matchMedia('(max-width: 900px)').matches ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    playVersion(path, key) {
        if (!path) return;

        if (this.isMobile()) {
            // Not window.open(): the CTA blocker patches it, which would swallow
            // this call and only show a toast. A real link click is untouched.
            const link = document.createElement('a');
            link.href = path;
            link.target = '_blank';
            link.rel = 'noopener';
            document.body.append(link);
            link.click();
            link.remove();
            return;
        }

        if (!window.deviceApi) return;

        this.currentVersionKey = key;
        window.deviceApi.load(path);
        document.body.classList.add('has-game');

        if (this.elements.stageEmpty) {
            this.elements.stageEmpty.style.display = 'none';
        }

        this.markActiveVersion();
    }

    markActiveVersion() {
        this.elements.gamesGrid.querySelectorAll('.version-item').forEach(item => {
            const active = item.dataset.key === this.currentVersionKey;
            item.classList.toggle('active', active);
            item.closest('.game-card').classList.toggle('playing', active);
        });
    }

}

// Wait for 'load' so the device engine (device/main.js) has created window.deviceApi
window.addEventListener('load', () => {
    window.gameList = new GameListManager(APP_CONFIG);
});
