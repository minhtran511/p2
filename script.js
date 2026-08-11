/**
 * Quản lý danh sách game và các tính năng tìm kiếm, lọc
 */
class GameListManager {
    constructor() {
        this.games = [];
        this.filteredGames = [];
        this.currentCategory = 'all';
        this.currentSearch = '';
        
        this.elements = {
            gamesGrid: document.getElementById('gamesGrid'),
            loading: document.getElementById('loading'),
            noResults: document.getElementById('noResults'),
            searchInput: document.getElementById('searchInput'),
            filterBtns: document.querySelectorAll('.filter-btn')
        };
        
        this.init();
    }
    
    /**
     * Khởi tạo ứng dụng
     */
    async init() {
        try {
            await this.loadGames();
            this.setupEventListeners();
            this.applyFilters();
        } catch (error) {
            console.error('Lỗi khởi tạo:', error);
            this.showError();
        }
    }
    
    /**
     * Load danh sách game từ thư mục playable/category
     */
    async loadGames() {
        // Danh sách game được hardcode dựa trên cấu trúc thư mục
        const gameData = [
            // Action Games
            { folder: 'action-bino', name: 'Bino', category: 'action', versions: ['v1', 'v2', 'v3'] },
            { folder: 'action-islandescape', name: 'Island Escape', category: 'action', versions: ['v1', 'v2', 'v3', 'v4'] },
            { folder: 'action-kingparty', name: 'King Party', category: 'action', versions: ['v1'] },
            { folder: 'action-mrbenescape', name: 'Mr Ben Escape', category: 'action', versions: ['v1', 'v2', 'v3'] },
            { folder: 'action-redbounce', name: 'Red Bounce', category: 'action', versions: ['v1'] },
            { folder: 'action-rescuethelover', name: 'Rescue The Lover', category: 'action', versions: ['v1', 'v2'] },
            { folder: 'action-scifisurvivor', name: 'SciFi Survivor', category: 'action', versions: ['v1'] },
            { folder: 'action-skyraptor', name: 'Sky Raptor', category: 'action', versions: ['v1', 'v2', 'v3', 'v4', 'v5'] },
            { folder: 'action-stickmanacherymaster', name: 'Stickman Achery Master', category: 'action', versions: ['v1'] },
            { folder: 'action-stickmanescape', name: 'Stickman Escape', category: 'action', versions: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12'] },
            { folder: 'action-windwings', name: 'Wind Wings', category: 'action', versions: ['v1'] },
            
            // Card Games
            { folder: 'card-pokellectorbattle', name: 'Pokellector Battle', category: 'card', versions: ['v1'] },
            { folder: 'card-winmoneysolitaire', name: 'Win Money Solitaire', category: 'card', versions: ['v1'] },
            
            // Casual Games
            { folder: 'casual-brainstory', name: 'Brain Story', category: 'casual', versions: ['v1'] },
            { folder: 'casual-bubbleshooter', name: 'Bubble Shooter', category: 'casual', versions: ['v1'] },
            { folder: 'casual-fnfbattlemusic', name: 'FNF Battle Music', category: 'casual', versions: ['v1', 'v2', 'v3'] },
            { folder: 'casual-fnfdrawpuzzle', name: 'FNF Draw Puzzle', category: 'casual', versions: ['v1', 'v2', 'v3'] },
            { folder: 'casual-fnferaserpuzzle', name: 'FNF Eraser Puzzle', category: 'casual', versions: ['v1'] },
            { folder: 'casual-grabpackplaytime', name: 'Grab Pack Playtime', category: 'casual', versions: ['v1', 'v2', 'v3', 'v4', 'v5'] },
            { folder: 'casual-magichands', name: 'Magic Hands', category: 'casual', versions: ['v1'] },
            { folder: 'casual-skibiditoilet', name: 'Skibidi Toilet', category: 'casual', versions: ['v1', 'v3', 'v6', 'v7'] },
            { folder: 'casual-trollrobber', name: 'Troll Robber', category: 'casual', versions: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'] },
            
            // Cooking Games
            { folder: 'cooking-cookingplaytime', name: 'Cooking Playtime', category: 'cooking', versions: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] },
            
            // Merge Games
            { folder: 'merge-alien2', name: 'Alien 2', category: 'merge', versions: ['v1'] },
            { folder: 'merge-mergehome', name: 'Merge Home', category: 'merge', versions: ['v1'] },
            { folder: 'merge-mergemutant', name: 'Merge Mutant', category: 'merge', versions: ['v1', 'v2'] },
            { folder: 'merge-mergesonic', name: 'Merge Sonic', category: 'merge', versions: ['v1', 'v2'] },
            { folder: 'merge-mergesuper', name: 'Merge Super', category: 'merge', versions: ['v1', 'v2'] },
            { folder: 'merge-mergetower', name: 'Merge Tower', category: 'merge', versions: ['v1', 'v2'] },
            { folder: 'merge-savetheimposter', name: 'Save The Imposter', category: 'merge', versions: ['v1'] },
            { folder: 'merge-weaponmaster', name: 'Weapon Master', category: 'merge', versions: ['v1', 'v2', 'v3'] },
            
            // Music Games
            { folder: 'music-duetcat', name: 'Duet Cat', category: 'music', versions: ['v1', 'v2'] },
            { folder: 'music-pianotiles', name: 'Piano Tiles', category: 'music', versions: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17'] },
            
            // Puzzle Games
            { folder: 'puzzle-artpuzzle', name: 'Art Puzzle', category: 'puzzle', versions: ['v1', 'v2', 'v3', 'v4'] },
            { folder: 'puzzle-coloringasmr', name: 'Coloring ASMR', category: 'puzzle', versions: ['v1'] },
            { folder: 'puzzle-dopstory', name: 'DOP Story', category: 'puzzle', versions: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] },
            { folder: 'puzzle-emojifun', name: 'Emoji Fun', category: 'puzzle', versions: ['v1', 'v2'] },
            { folder: 'puzzle-hexa3d', name: 'Hexa 3D', category: 'puzzle', versions: ['v1', 'v2'] },
            { folder: 'puzzle-jigsaw', name: 'Jigsaw', category: 'puzzle', versions: ['v1'] },
            { folder: 'puzzle-naughty', name: 'Naughty', category: 'puzzle', versions: ['v1'] },
            { folder: 'puzzle-pixelpainter', name: 'Pixel Painter', category: 'puzzle', versions: ['v1'] },
            { folder: 'puzzle-screwjam3d', name: 'Screw Jam 3D', category: 'puzzle', versions: ['v1'] },
            { folder: 'puzzle-tatooart', name: 'Tatoo Art', category: 'puzzle', versions: ['v1', 'v2'] },
            { folder: 'puzzle-trollmaster1', name: 'Troll Master 1', category: 'puzzle', versions: ['v1'] },
            { folder: 'puzzle-dotslink', name: 'Dot Link - Connect the Dots', category: 'puzzle', versions: ['v1'] },
            { folder: 'puzzle-fusionblockpuzzle', name: 'Fusion Blocks - A Puzzle Game', category: 'puzzle', versions: ['v1'] },
            { folder: 'puzzle-holeshooter', name: 'Girl Rescue - Hole Shooter Jam', category: 'puzzle', versions: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'] },
            { folder: 'puzzle-memedrop', name: 'Meme Drop: Brainrot Merge', category: 'puzzle', versions: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] },

            // Race Games
            { folder: 'race-carrace3d', name: 'Car Race 3D', category: 'race', versions: ['v1', 'v2', 'v3', 'v4'] },
            
            // Shooting Games
            { folder: 'shooting-balloonshooter', name: 'Balloon Shooter', category: 'shooting', versions: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] },
            
            // Simulation Games
            { folder: 'simulation-aliencatcher', name: 'Alien Catcher', category: 'simulation', versions: ['v1', 'v2', 'v3', 'v4', 'v5'] },
            { folder: 'simulation-blockcrusher', name: 'Block Crusher', category: 'simulation', versions: ['v1', 'v2'] },
            { folder: 'simulation-boba', name: 'Boba', category: 'simulation', versions: ['v1', 'v2', 'v3', 'v4', 'v5'] },
            { folder: 'simulation-gangster', name: 'Gangster', category: 'simulation', versions: ['v1', 'v2', 'v3'] },
            { folder: 'simulation-minimart', name: 'Mini Mart', category: 'simulation', versions: ['v1'] },
            { folder: 'simulation-spiderfighting', name: 'Spider Fighting', category: 'simulation', versions: ['v1'] },
            { folder: 'simulation-supermarket', name: 'Supermarket', category: 'simulation', versions: ['v1'] },
            { folder: 'simulation-vape', name: 'Vape', category: 'simulation', versions: ['v1', 'v2', 'v3', 'v4', 'v5'] },
            { folder: 'simulation-voxelbuilder', name: 'Voxel Builder', category: 'simulation', versions: ['v1'] },
            { folder: 'simulation-zombieshoot', name: 'Zombie Shoot', category: 'simulation', versions: ['v1'] }
        ];
        
        this.games = gameData;
        this.filteredGames = [...this.games];
    }
    
    /**
     * Thiết lập event listeners
     */
    setupEventListeners() {
        // Search input
        this.elements.searchInput.addEventListener('input', (e) => {
            this.currentSearch = e.target.value.toLowerCase().trim();
            this.applyFilters();
        });
        
        // Category filters
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                this.elements.filterBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                
                this.currentCategory = e.target.dataset.category;
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
                game.category.toLowerCase().includes(this.currentSearch)
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
        const categoryIcons = {
            action: '⚔️',
            casual: '🎮',
            puzzle: '🧩',
            music: '🎵',
            merge: '🔄',
            cooking: '🍳',
            simulation: '🏗️',
            shooting: '🎯',
            race: '🏎️',
            card: '🃏'
        };
        
        const categoryNames = {
            action: 'Action',
            casual: 'Casual',
            puzzle: 'Puzzle',
            music: 'Music',
            merge: 'Merge',
            cooking: 'Cooking',
            simulation: 'Simulation',
            shooting: 'Shooting',
            race: 'Racing',
            card: 'Card'
        };
        
        const versionsHtml = game.versions.map(version => {
            const deviceUrl = `./device/?page=../playable/category/${game.folder}/${version}.html`;
            const directUrl = `./playable/category/${game.folder}/${version}.html`;
            return `<div class="version-item" data-device="${deviceUrl}" data-direct="${directUrl}">${version}</div>`;
        }).join('');
        
        return `
            <div class="game-card" data-category="${game.category}">
                <div class="game-header">
                    <div class="game-icon">
                        ${categoryIcons[game.category] || '🎮'}
                    </div>
                    <div class="game-info">
                        <h3>${game.name}</h3>
                        <span class="game-category">${categoryNames[game.category] || game.category}</span>
                    </div>
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
            item.addEventListener('click', (e) => {
                const deviceUrl = item.dataset.device;
                const directUrl = item.dataset.direct;
                
                // Phát hiện mobile device
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                if (isMobile) {
                    // Mobile: mở game trực tiếp
                    window.open(directUrl, '_blank');
                } else {
                    // Desktop: hiển thị modal với 2 options
                    this.showOptionsModal(deviceUrl, directUrl, item.textContent);
                }
            });
        });
    }
    
    /**
     * Hiển thị modal với 2 options cho desktop
     */
    showOptionsModal(deviceUrl, directUrl, version) {
        // Tạo modal
        const modal = document.createElement('div');
        modal.className = 'options-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Choose Option for ${version}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <button class="option-btn device-option" data-url="${deviceUrl}">
                        <div class="option-icon">📱</div>
                        <div class="option-text">
                            <strong>Device Preview</strong>
                            <small>View in mobile simulator</small>
                        </div>
                    </button>
                    <button class="option-btn direct-option" data-url="${directUrl}">
                        <div class="option-icon">🎮</div>
                        <div class="option-text">
                            <strong>Play Direct</strong>
                            <small>Open game directly</small>
                        </div>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners cho modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        modal.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.open(btn.dataset.url, '_blank');
                document.body.removeChild(modal);
            });
        });
        
        // Show modal với animation
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    /**
     * Hiển thị thông báo lỗi
     */
    showError() {
        this.elements.loading.innerHTML = `
            <div class="no-results-icon">❌</div>
            <h3>Error Occurred</h3>
            <p>Unable to load game library. Please try again later.</p>
        `;
    }
}

// Khởi tạo ứng dụng khi trang đã load xong
document.addEventListener('DOMContentLoaded', () => {
    new GameListManager();
});
