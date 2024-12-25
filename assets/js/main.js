class APIViewer {
    constructor() {
        this.currentVersion = 'v1.0';
        this.versionSelect = document.getElementById('version-select');
        this.categoriesList = document.getElementById('categories-list');
        this.apiContent = document.getElementById('api-content');
        this.sidebar = document.getElementById('sidebar');
        this.themeToggle = document.getElementById('theme-toggle');
        
        this.initEventListeners();
        this.loadCategories();
        this.pathIndex = {}; // Store path mappings
        this.initThemeToggle();
    }

    initEventListeners() {
        this.versionSelect.addEventListener('change', (e) => {
            this.currentVersion = e.target.value;
            this.loadCategories();
        });
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.currentVersion}/index.json`);
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

        this.categoriesList.innerHTML = sortedCategories.map(category => `
            <div class="nav-item mb-1" data-name="${category.name}">
                <button class="btn w-100 text-start" data-category="${category.name}">
                    <i class="bi bi-folder2"></i>
                    <span>${category.name}</span>
                </button>
            </div>
        `).join('');

        document.querySelectorAll('[data-category]').forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('[data-category]').forEach(btn => 
                    btn.classList.remove('active')
                );
                // Add active class to clicked button
                e.currentTarget.classList.add('active');
                const category = e.currentTarget.dataset.category;
                this.loadEndpoints(category);
            });
        });
    }

    async loadEndpoints(category) {
        try {
            // Load path index first
            const indexResponse = await fetch(`${this.currentVersion}/${category}/_path_index.json`);
            this.pathIndex = await indexResponse.json();
            
            const response = await fetch(`${this.currentVersion}/${category}/_metadata.json`);
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

            this.apiContent.innerHTML = `
                <div class="category-header">
                    <h2>${category}</h2>
                    ${data.info?.description ? `<p class="text-muted mb-0">${data.info.description}</p>` : ''}
                </div>
                <div class="endpoints-container">
                    ${sortedTags.map(tag => `
                        <div class="tag-section-header">${tag}</div>
                        ${taggedEndpoints[tag].map(endpoint => `
                            <div class="endpoint-row" data-hash="${endpoint.hash}">
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

            // Load and display available methods for each endpoint
            endpoints.forEach(async endpoint => {
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
            });

            // Handle endpoint expansion
            document.querySelectorAll('.endpoint-header').forEach(header => {
                header.addEventListener('click', async (e) => {
                    const endpointRow = header.closest('.endpoint-row');
                    const detailsSection = endpointRow.querySelector('.endpoint-details');
                    const expandBtn = header.querySelector('.expand-btn i');
                    
                    if (!detailsSection.classList.contains('show')) {
                        const hash = endpointRow.dataset.hash;
                        const data = await this.loadEndpointData(category, hash);
                        if (data) {
                            detailsSection.querySelector('.endpoint-content').innerHTML = this.renderEndpointDetails(data);
                        }
                    }
                    
                    detailsSection.classList.toggle('show');
                    expandBtn.classList.toggle('bi-chevron-down');
                    expandBtn.classList.toggle('bi-chevron-up');
                });
            });
        } catch (error) {
            console.error('Error loading endpoints:', error);
        }
    }

    async loadEndpointData(category, hashedPath) {
        try {
            const response = await fetch(`${this.currentVersion}/${category}/${hashedPath}.json`);
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
            this.themeToggle.querySelector('i').classList.remove('bi-sun-fill', 'bi-moon-fill');
            this.themeToggle.querySelector('i').classList.add(isDark ? 'bi-moon-fill' : 'bi-sun-fill');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };

        this.themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setTheme(!isDark);
        });

        // Set initial theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme === 'dark');
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new APIViewer();
});