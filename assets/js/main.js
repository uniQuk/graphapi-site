class APIViewer {
    constructor() {
        this.basePath = window.__BASE_PATH__ || '/';
        this.currentVersion = 'v1.0';
        
        // Cache DOM elements
        this.elements = {
            versionSelect: document.getElementById('version-select'),
            categoriesList: document.getElementById('categories-list'),
            apiContent: document.getElementById('api-content'),
            sidebar: document.getElementById('sidebar'),
            themeToggle: document.getElementById('theme-toggle'),
            homeButton: document.getElementById('home-button'),
            mainContent: document.querySelector('main')
        };
        
        // Initialize state
        this.pathIndex = {};
        this.router = {
            version: 'v1.0',
            category: null,
            tag: null,
            endpoint: null
        };
        
        this.initEventListeners();
        this.loadCategories();
        this.initThemeToggle();
        this.initRouter();
        
        // Initialize with delegated events
        this.initDelegatedEvents();
    }

    initRouter() {
        // Handle initial load and back/forward navigation
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    handleRoute() {
        // Parse URL hash: #/version/category/tag/endpoint
        const hash = window.location.hash.slice(1) || '';
        const [, version, category, tag, endpoint] = hash.split('/');

        // Update router state
        this.router = {
            version: version || 'v1.0',
            category: category || null,
            tag: tag || null,
            endpoint: endpoint || null
        };

        // Update UI based on route
        this.updateFromRoute();
    }

    updateFromRoute() {
        // Update version selector
        this.elements.versionSelect.value = this.router.version;
        this.currentVersion = this.router.version;

        // Load categories and select active one
        this.loadCategories().then(() => {
            if (this.router.category) {
                const categoryButton = document.querySelector(`[data-category="${this.router.category}"]`);
                if (categoryButton) {
                    categoryButton.classList.add('active');
                    this.loadEndpoints(this.router.category).then(() => {
                        if (this.router.endpoint) {
                            const endpoint = document.querySelector(`[data-hash="${this.router.endpoint}"]`);
                            if (endpoint) {
                                endpoint.querySelector('.endpoint-header').click();
                                // Add slight delay to ensure content is expanded before scrolling
                                setTimeout(() => {
                                    endpoint.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                            }
                        } else if (this.router.tag) {
                            this.scrollToTag(this.getTagId(this.router.tag));
                        }
                    });
                }
            }
        });
    }

    updateURL() {
        let url = `${this.basePath}#/${this.router.version}`;
        if (this.router.category) {
            url += `/${this.router.category}`;
            if (this.router.tag) {
                url += `/${this.router.tag}`;
                if (this.router.endpoint) {
                    url += `/${this.router.endpoint}`;
                }
            }
        }
        window.history.pushState(null, '', url);
    }

    scrollToTag(tagId) {
        const element = document.getElementById(tagId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    initEventListeners() {
        this.elements.versionSelect.addEventListener('change', (e) => {
            this.router.version = e.target.value;
            this.router.category = null;
            this.router.tag = null;
            this.router.endpoint = null;
            this.updateURL();
            this.loadCategories();
        });

        this.elements.homeButton.addEventListener('click', () => {
            this.router = {
                version: this.currentVersion,
                category: null,
                tag: null,
                endpoint: null
            };
            window.location.hash = '';
            this.elements.apiContent.innerHTML = `
                <div class="text-center text-muted" id="empty-state">
                    <i class="bi bi-arrow-left-circle fs-1"></i>
                    <h4 class="mt-3">Select a category from the sidebar</h4>
                </div>
            `;
        });
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.basePath}${this.currentVersion}/index.json`);
            const categories = await response.json();
            this.renderCategories(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCategories(categories) {
        // Sort categories alphabetically
        const sortedCategories = categories.sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        this.elements.categoriesList.innerHTML = sortedCategories.map(category => `
            <div class="nav-item mb-1" data-name="${category.name}">
                <button class="btn w-100 text-start" data-category="${category.name}">
                    <i class="bi bi-folder2"></i>
                    <span>${category.name}</span>
                </button>
            </div>
        `).join('');
    }

    async loadEndpoints(category) {
        try {
            // Reset scroll position when loading new category
            this.elements.mainContent.scrollTo(0, 0);
            
            // Load path index first
            const indexResponse = await fetch(`${this.basePath}${this.currentVersion}/${category}/_path_index.json`);
            this.pathIndex = await indexResponse.json();
            
            const response = await fetch(`${this.basePath}${this.currentVersion}/${category}/_metadata.json`);
            const data = await response.json();
            
            const endpoints = Object.entries(this.pathIndex).map(([hash, path]) => ({
                hash,
                path
            }));

            // Load all endpoint data first to get tags and summaries
            const endpointData = await Promise.all(
                endpoints.map(async endpoint => {
                    const data = await this.loadEndpointData(category, endpoint.hash);
                    return { ...endpoint, data };
                })
            );

            // Group endpoints by tags
            const taggedEndpoints = {};
            endpointData.forEach(endpoint => {
                const [path, methods] = Object.entries(endpoint.data)[0];
                const tags = Object.values(methods)[0].tags || ['untagged'];
                tags.forEach(tag => {
                    if (!taggedEndpoints[tag]) {
                        taggedEndpoints[tag] = [];
                    }
                    taggedEndpoints[tag].push({
                        ...endpoint,
                        summary: Object.values(methods)[0].summary
                    });
                });
            });

            // Sort tags alphabetically
            const sortedTags = Object.keys(taggedEndpoints).sort();

            this.elements.apiContent.innerHTML = `
                <div class="category-header">
                    <h2>${category}</h2>
                    ${data.info?.description ? `<p class="text-muted mb-0">${data.info.description}</p>` : ''}
                </div>
                <div class="endpoints-container">
                    ${sortedTags.map(tag => `
                        <div class="tag-section-header" id="${this.getTagId(tag)}">
                            <div class="tag-title">
                                <span>${tag}</span>
                                <button class="btn btn-link btn-sm copy-tag" data-tag="${tag}" title="Copy link to section">
                                    <i class="bi bi-link-45deg"></i>
                                </button>
                            </div>
                        </div>
                        ${taggedEndpoints[tag].map(endpoint => `
                            <div class="endpoint-row" data-hash="${endpoint.hash}" data-tag="${tag}">
                                <div class="endpoint-header">
                                    <div>
                                        <div class="endpoint-methods">
                                            <!-- Methods will be dynamically added -->
                                        </div>
                                        <div class="endpoint-path">
                                            <code>${this.formatPath(endpoint.path)}</code>
                                            ${endpoint.summary ? `
                                                <div class="endpoint-summary">${endpoint.summary}</div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <button class="btn btn-sm btn-link expand-btn">
                                        <i class="bi bi-chevron-down"></i>
                                    </button>
                                </div>
                                <div class="endpoint-details collapse">
                                    <div class="endpoint-content"></div>
                                </div>
                            </div>
                        `).join('')}
                    `).join('')}
                </div>
            `;

            // Load methods for all endpoints at once
            await Promise.all(endpoints.map(async endpoint => {
                const data = await this.loadEndpointData(category, endpoint.hash);
                if (data) {
                    const methodsContainer = document.querySelector(`[data-hash="${endpoint.hash}"] .endpoint-methods`);
                    if (methodsContainer) {
                        const methods = Object.keys(Object.values(data)[0]);
                        methodsContainer.innerHTML = methods.map(method => 
                            `<span class="method ${method.toLowerCase()}">${method}</span>`
                        ).join('');
                    }
                }
            }));

            // If there's a tag in the URL, scroll to it
            if (this.router.tag) {
                this.scrollToTag(this.getTagId(this.router.tag));
            }

        } catch (error) {
            console.error('Error loading endpoints:', error);
        }
    }

    async loadEndpointData(category, hashedPath) {
        try {
            const response = await fetch(`${this.basePath}${this.currentVersion}/${category}/${hashedPath}.json`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error loading endpoint data:', error);
            return null;
        }
    }

    formatPath(path) {
        // Split the path by forward slashes, but keep the slashes
        return path.split(/(?=\/)/).map(segment => 
            `<span>${segment}</span>`
        ).join('');
    }

    renderMethods(path) {
        const methods = ['get', 'post', 'put', 'patch', 'delete'];
        return `
            <div class="methods">
                ${methods.map(method => `
                    <span class="method ${method}">${method.toUpperCase()}</span>
                `).join('')}
            </div>
        `;
    }

    renderEndpointDetails(data) {
        const [path, pathData] = Object.entries(data)[0];
        return `
            <div class="endpoint-content">
                ${Object.entries(pathData).map(([method, methodData]) => `
                    <div class="method-section method-bg ${method.toLowerCase()}">
                        <div class="method-header d-flex align-items-center gap-2">
                            <span class="method ${method.toLowerCase()}">${method}</span>
                            <div class="endpoint-path">
                                <code>${this.formatPath(path)}</code>
                            </div>
                        </div>
                        ${methodData.summary ? `
                            <div class="mb-2">
                                <h6 class="mb-1">Summary</h6>
                                <p class="text-muted mb-0">${methodData.summary}</p>
                            </div>
                        ` : ''}
                        ${methodData.description ? `
                            <div class="mb-2">
                                <h6 class="mb-1">Description</h6>
                                <p class="text-muted mb-0">${methodData.description}</p>
                            </div>
                        ` : ''}
                        ${this.renderParameters(methodData.parameters)}
                        ${this.renderResponseSchema(methodData.responses)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderParameters(parameters = []) {
        if (!parameters?.length) return '';
        return `
            <div class="mb-4">
                <h5 class="mb-3">Parameters</h5>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width: 20%">Name</th>
                                <th style="width: 10%">In</th>
                                <th style="width: 15%">Type</th>
                                <th style="width: 15%">Required</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${parameters.map(param => `
                                <tr>
                                    <td><code>${param.name}</code></td>
                                    <td><span class="badge bg-secondary">${param.in || ''}</span></td>
                                    <td><span class="badge bg-secondary">${param.schema?.type || param.type || ''}</span></td>
                                    <td>${param.required ? '<span class="badge bg-danger">Required</span>' : ''}</td>
                                    <td class="text-wrap">${param.description || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderResponseSchema(responses = {}) {
        return `
            <div class="mb-4">
                <h5>Responses</h5>
                <div class="list-group">
                    ${Object.entries(responses).map(([code, response]) => `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="d-flex flex-column">
                                    <code class="mb-1">${code}</code>
                                    ${response.description ? `
                                        <span class="text-muted">${response.description}</span>
                                    ` : ''}
                                </div>
                                ${response.$ref ? `
                                    <div class="text-muted small">
                                        <code class="text-wrap">${response.$ref}</code>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    initThemeToggle() {
        const setTheme = (isDark) => {
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            const icon = this.elements.themeToggle.querySelector('i');
            icon.classList.remove('bi-sun-fill', 'bi-moon-fill');
            icon.classList.add(isDark ? 'bi-moon-fill' : 'bi-sun-fill');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };

        this.elements.themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setTheme(!isDark);
        });

        // Set initial theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme === 'dark');
    }

    // Helper method to generate consistent tag IDs
    getTagId(tag) {
        return `tag-${tag.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }

    initDelegatedEvents() {
        // Delegate category list clicks
        this.elements.categoriesList.addEventListener('click', (e) => {
            const categoryButton = e.target.closest('[data-category]');
            if (!categoryButton) return;

            // Reset scroll position
            this.elements.mainContent.scrollTo(0, 0);
            
            // Update active state
            document.querySelectorAll('[data-category]').forEach(btn => 
                btn.classList.remove('active')
            );
            categoryButton.classList.add('active');

            // Update router and load endpoints
            const category = categoryButton.dataset.category;
            this.router.category = category;
            this.router.tag = null;
            this.router.endpoint = null;
            this.updateURL();
            this.loadEndpoints(category);
        });

        // Delegate API content clicks
        this.elements.apiContent.addEventListener('click', async (e) => {
            // Handle copy tag button clicks
            if (e.target.closest('.copy-tag')) {
                e.stopPropagation();
                const button = e.target.closest('.copy-tag');
                await this.handleTagCopy(button);
                return;
            }

            // Handle endpoint header clicks
            if (e.target.closest('.endpoint-header')) {
                const header = e.target.closest('.endpoint-header');
                await this.handleEndpointExpand(header);
            }
        });
    }

    async handleTagCopy(button) {
        const tag = button.dataset.tag;
        const url = `${window.location.origin}${window.location.pathname}#/${this.router.version}/${this.router.category}/${encodeURIComponent(tag)}`;
        
        try {
            await this.copyToClipboard(url);
            this.showCopyFeedback(button);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    async handleEndpointExpand(header) {
        const endpointRow = header.closest('.endpoint-row');
        const detailsSection = endpointRow.querySelector('.endpoint-details');
        const expandBtn = header.querySelector('.expand-btn i');
        
        if (!detailsSection.classList.contains('show')) {
            const hash = endpointRow.dataset.hash;
            const data = await this.loadEndpointData(this.router.category, hash);
            if (data) {
                detailsSection.querySelector('.endpoint-content').innerHTML = this.renderEndpointDetails(data);
            }
        }
        
        detailsSection.classList.toggle('show');
        expandBtn.classList.toggle('bi-chevron-down');
        expandBtn.classList.toggle('bi-chevron-up');

        // Update router state and URL
        const tag = endpointRow.dataset.tag;
        this.router.tag = tag;
        this.router.endpoint = endpointRow.dataset.hash;
        this.updateURL();
    }

    async copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    showCopyFeedback(button) {
        const icon = button.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'bi bi-check-lg';
        setTimeout(() => {
            icon.className = originalClass;
        }, 1000);
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new APIViewer();
});