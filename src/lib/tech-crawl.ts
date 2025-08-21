import puppeteer from 'puppeteer';

// 全局变量存储网络请求和响应
let networkRequests = [];
let networkResponses = [];

/**
 * 获取网站技术信息的主方法
 * @param {string} url - 目标网站URL
 * @param {Object} options - 配置选项
 * @returns {Object} 技术信息对象
 */
export async function getTechInfo(url, options = {}) {
    const config = {
        headless: true,
        timeout: 30000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options
    };

    let browser = null;
    let page = null;

    try {
        // 初始化浏览器
        const browserData = await initBrowser(config);
        browser = browserData.browser;
        page = browserData.page;
        
        // 访问目标网站
        await page.goto(url, { 
            waitUntil: 'networkidle0', 
            timeout: config.timeout 
        });

        // 收集各种技术信息
        const techInfo = {
            url: url,
            timestamp: new Date().toISOString(),
            software: await detectSoftware(page),
            webServices: await detectWebServices(),
            hardware: await detectHardware(page),
            frameworks: await detectFrameworks(page),
            libraries: await detectLibraries(page),
            cms: await detectCMS(page),
            analytics: await detectAnalytics(),
            security: await detectSecurity(),
            hosting: await detectHosting(),
            performance: await getPerformanceInfo(page)
        };

        return techInfo;

    } catch (error) {
        console.error('爬取技术信息时发生错误:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * 初始化浏览器和页面
 */
async function initBrowser(config) {
    const browser = await puppeteer.launch({
        headless: config.headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(config.userAgent);
    await page.setViewport({ width: 1920, height: 1080 });

    // 重置网络监听数组
    let networkRequests = [];
    let networkResponses = [];

    // 监听网络请求
    await page.setRequestInterception(true);
    page.on('request', request => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            resourceType: request.resourceType()
        });
        request.continue();
    });

    // 监听响应
    page.on('response', response => {
        networkResponses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            fromCache: response.fromCache()
        });
    });

    return { browser, page };
}

/**
 * 检测软件系统信息
 */
async function detectSoftware(page) {
    return await page.evaluate(() => {
        const software = [];
        
        // 检测生成器meta标签
        const generatorMeta = document.querySelector('meta[name="generator"]');
        if (generatorMeta) {
            const content = generatorMeta.content;
            software.push({
                category: '内容管理系统',
                name: content.split(' ')[0],
                version: content.match(/\d+\.\d+[\.\d]*/) ? content.match(/\d+\.\d+[\.\d]*/)[0] : 'unknown',
                purpose: '网站内容管理',
                vendor: 'unknown'
            });
        }

        // 检测jQuery
        if (window.jQuery) {
            software.push({
                category: 'JavaScript库',
                name: 'jQuery',
                version: window.jQuery.fn.jquery || 'unknown',
                purpose: 'DOM操作和AJAX',
                vendor: 'jQuery Foundation'
            });
        }

        // 检测React（通过多种方式）
        if (window.React || 
            document.querySelector('[data-reactroot]') ||
            document.querySelector('script[src*="react"]') ||
            document.querySelector('#root') ||
            document.querySelector('[id*="react"]')) {
            
            let version = 'unknown';
            if (window.React && window.React.version) {
                version = window.React.version;
            }
            
            software.push({
                category: 'JavaScript框架',
                name: 'React',
                version: version,
                purpose: '用户界面构建',
                vendor: 'Meta (Facebook)'
            });
        }

        // 检测Vue.js（通过多种方式）
        if (window.Vue ||
            document.querySelector('[data-v-]') ||
            document.querySelector('[v-cloak]') ||
            document.querySelector('script[src*="vue"]') ||
            document.querySelector('#app[data-server-rendered]') ||
            document.querySelector('[id*="vue"]') ||
            document.querySelector('*[class*="v-"]')) {
            
            let version = 'unknown';
            // Vue 3
            if (window.Vue && window.Vue.version) {
                version = window.Vue.version;
            }
            // Vue 2
            else if (window.Vue && window.Vue.config && window.Vue.config.version) {
                version = window.Vue.config.version;
            }
            
            software.push({
                category: 'JavaScript框架',
                name: 'Vue.js',
                version: version,
                purpose: '渐进式Web应用框架',
                vendor: 'Vue.js Team'
            });
        }

        // 检测Angular
        if (window.ng || 
            window.angular ||
            document.querySelector('ng-app') ||
            document.querySelector('[ng-app]') ||
            document.querySelector('script[src*="angular"]') ||
            document.querySelector('*[ng-]')) {
            
            let version = 'unknown';
            if (window.ng && window.ng.version) {
                version = window.ng.version.full;
            } else if (window.angular && window.angular.version) {
                version = window.angular.version.full;
            }
            
            software.push({
                category: 'JavaScript框架',
                name: 'Angular',
                version: version,
                purpose: '企业级应用框架',
                vendor: 'Google'
            });
        }

        // 检测Next.js
        if (document.querySelector('script[src*="next"]') ||
            document.querySelector('#__next') ||
            window.__NEXT_DATA__) {
            
            software.push({
                category: 'JavaScript框架',
                name: 'Next.js',
                version: 'unknown',
                purpose: 'React全栈框架',
                vendor: 'Vercel'
            });
        }

        // 检测Nuxt.js
        if (document.querySelector('#__nuxt') ||
            window.__NUXT__ ||
            document.querySelector('script[src*="nuxt"]')) {
            
            software.push({
                category: 'JavaScript框架',
                name: 'Nuxt.js',
                version: 'unknown',
                purpose: 'Vue.js全栈框架',
                vendor: 'Nuxt Team'
            });
        }

        return software;
    });
}

/**
 * 检测网络服务
 */
async function detectWebServices() {
    const services = [];
    
    // 分析网络请求和响应头
    networkResponses.forEach(response => {
        const headers = response.headers;
        
        // Web服务器检测
        if (headers.server) {
            const serverInfo = parseServerHeader(headers.server);
            if (serverInfo) {
                services.push({
                    category: 'Web服务器',
                    name: serverInfo.name,
                    version: serverInfo.version,
                    purpose: 'HTTP服务',
                    vendor: getVendorByServer(serverInfo.name)
                });
            }
        }

        // CDN检测
        if (headers['cf-ray'] || headers['cf-cache-status']) {
            services.push({
                category: 'CDN服务',
                name: 'Cloudflare',
                version: 'unknown',
                purpose: '内容分发网络',
                vendor: 'Cloudflare Inc.'
            });
        }

        // AWS CloudFront
        if (headers['x-amz-cf-id']) {
            services.push({
                category: 'CDN服务',
                name: 'AWS CloudFront',
                version: 'unknown',
                purpose: '内容分发网络',
                vendor: 'Amazon Web Services'
            });
        }

        // Fastly CDN
        if (headers['fastly-debug-digest']) {
            services.push({
                category: 'CDN服务',
                name: 'Fastly',
                version: 'unknown',
                purpose: '内容分发网络',
                vendor: 'Fastly Inc.'
            });
        }

        // 负载均衡器和缓存检测
        if (headers['x-served-by'] || headers['x-cache']) {
            services.push({
                category: '缓存服务',
                name: 'Varnish Cache',
                version: 'unknown',
                purpose: 'HTTP缓存加速',
                vendor: 'Varnish Software'
            });
        }
    });

    return deduplicateServices(services);
}

/**
 * 检测硬件设备信息（基于推断）
 */
async function detectHardware(page) {
    const hardware = [];
    
    // 通过性能API推断硬件信息
    const performanceInfo = await page.evaluate(() => {
        const info = {};
        
        if (navigator.hardwareConcurrency) {
            info.cpuCores = navigator.hardwareConcurrency;
        }
        
        if (navigator.deviceMemory) {
            info.memory = navigator.deviceMemory;
        }
        
        if (navigator.platform) {
            info.platform = navigator.platform;
        }
        
        if (navigator.userAgent) {
            info.userAgent = navigator.userAgent;
        }

        // 检测GPU信息
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    info.gpu = {
                        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                    };
                }
            }
        } catch (e) {
            // GPU信息获取失败
        }
        
        return info;
    });

    if (performanceInfo.cpuCores) {
        hardware.push({
            category: '处理器',
            name: 'CPU',
            version: `${performanceInfo.cpuCores} cores`,
            purpose: '计算处理',
            vendor: 'unknown'
        });
    }

    if (performanceInfo.memory) {
        hardware.push({
            category: '内存',
            name: 'RAM',
            version: `${performanceInfo.memory}GB`,
            purpose: '数据存储',
            vendor: 'unknown'
        });
    }

    if (performanceInfo.gpu) {
        hardware.push({
            category: '图形处理器',
            name: 'GPU',
            version: performanceInfo.gpu.renderer,
            purpose: '图形渲染',
            vendor: performanceInfo.gpu.vendor
        });
    }

    return hardware;
}

/**
 * 检测前端框架和UI库
 */
async function detectFrameworks(page) {
    return await page.evaluate(() => {
        const frameworks = [];
        
        // Bootstrap检测
        if (document.querySelector('link[href*="bootstrap"]') || 
            document.querySelector('script[src*="bootstrap"]') ||
            document.querySelector('.container') ||
            document.querySelector('.row') ||
            document.querySelector('[class*="col-"]')) {
            frameworks.push({
                category: 'CSS框架',
                name: 'Bootstrap',
                version: 'unknown',
                purpose: '响应式UI框架',
                vendor: 'Bootstrap Team'
            });
        }

        // Tailwind CSS检测
        if (document.querySelector('link[href*="tailwind"]') ||
            document.querySelector('[class*="tw-"]') ||
            document.querySelector('[class*="bg-"]') ||
            document.querySelector('[class*="text-"]') ||
            document.querySelector('[class*="flex"]')) {
            frameworks.push({
                category: 'CSS框架',
                name: 'Tailwind CSS',
                version: 'unknown',
                purpose: 'utility-first CSS框架',
                vendor: 'Tailwind Labs'
            });
        }

        // Material-UI检测
        if (document.querySelector('[class*="MuiButton"]') ||
            document.querySelector('[class*="Mui"]') ||
            document.querySelector('link[href*="material"]')) {
            frameworks.push({
                category: 'UI组件库',
                name: 'Material-UI',
                version: 'unknown',
                purpose: 'React UI组件库',
                vendor: 'MUI Team'
            });
        }

        // Ant Design检测
        if (document.querySelector('[class*="ant-"]') ||
            document.querySelector('link[href*="antd"]')) {
            frameworks.push({
                category: 'UI组件库',
                name: 'Ant Design',
                version: 'unknown',
                purpose: '企业级UI设计语言',
                vendor: 'Ant Design Team'
            });
        }

        // Element UI检测
        if (document.querySelector('[class*="el-"]')) {
            frameworks.push({
                category: 'UI组件库',
                name: 'Element UI',
                version: 'unknown',
                purpose: 'Vue.js桌面端组件库',
                vendor: 'Element Team'
            });
        }

        return frameworks;
    });
}

/**
 * 检测第三方库和服务
 */
async function detectLibraries(page) {
    const libraries = [];

    // 页面内检测
    const pageLibraries = await page.evaluate(() => {
        const libs = [];
        
        // Google Analytics检测
        if (window.gtag || window.ga || window.dataLayer || window.google_tag_manager) {
            libs.push({
                category: '分析工具',
                name: 'Google Analytics',
                version: 'unknown',
                purpose: '网站分析',
                vendor: 'Google'
            });
        }

        // Google Tag Manager
        if (window.google_tag_manager) {
            libs.push({
                category: '标签管理',
                name: 'Google Tag Manager',
                version: 'unknown',
                purpose: '标签管理系统',
                vendor: 'Google'
            });
        }

        // Facebook Pixel
        if (window.fbq || document.querySelector('script[src*="facebook.net"]')) {
            libs.push({
                category: '分析工具',
                name: 'Facebook Pixel',
                version: 'unknown',
                purpose: '转化追踪',
                vendor: 'Meta (Facebook)'
            });
        }

        // Lodash
        if (window._ && window._.VERSION) {
            libs.push({
                category: 'JavaScript库',
                name: 'Lodash',
                version: window._.VERSION,
                purpose: '实用工具库',
                vendor: 'Lodash Team'
            });
        }

        // Moment.js
        if (window.moment) {
            libs.push({
                category: 'JavaScript库',
                name: 'Moment.js',
                version: window.moment.version || 'unknown',
                purpose: '日期时间处理',
                vendor: 'Moment.js Team'
            });
        }

        return libs;
    });

    libraries.push(...pageLibraries);

    // 网络请求检测
    networkRequests.forEach(request => {
        if (request.url.includes('google-analytics.com') || 
            request.url.includes('googletagmanager.com')) {
            libraries.push({
                category: '网站分析',
                name: 'Google Analytics',
                version: 'unknown',
                purpose: '用户行为分析',
                vendor: 'Google'
            });
        }

        if (request.url.includes('facebook.net') || 
            request.url.includes('connect.facebook.net')) {
            libraries.push({
                category: '社交插件',
                name: 'Facebook SDK',
                version: 'unknown',
                purpose: '社交功能集成',
                vendor: 'Meta (Facebook)'
            });
        }
    });

    return deduplicateServices(libraries);
}

/**
 * 检测CMS系统
 */
async function detectCMS(page) {
    return await page.evaluate(() => {
        const cms = [];
        
        // WordPress检测
        if (document.querySelector('link[href*="wp-content"]') ||
            document.querySelector('script[src*="wp-content"]') ||
            document.querySelector('meta[name="generator"][content*="WordPress"]') ||
            document.querySelector('link[href*="wp-includes"]')) {
            
            let version = 'unknown';
            const versionMeta = document.querySelector('meta[name="generator"]');
            if (versionMeta && versionMeta.content.includes('WordPress')) {
                const match = versionMeta.content.match(/WordPress ([\d.]+)/);
                if (match) version = match[1];
            }
            
            cms.push({
                category: '内容管理系统',
                name: 'WordPress',
                version: version,
                purpose: '内容管理',
                vendor: 'Automattic'
            });
        }

        // Drupal检测
        if (document.querySelector('script[src*="drupal"]') ||
            document.querySelector('meta[name="generator"][content*="Drupal"]') ||
            document.querySelector('link[href*="drupal"]')) {
            cms.push({
                category: '内容管理系统',
                name: 'Drupal',
                version: 'unknown',
                purpose: '内容管理',
                vendor: 'Drupal Association'
            });
        }

        // Joomla检测
        if (document.querySelector('script[src*="joomla"]') ||
            document.querySelector('meta[name="generator"][content*="Joomla"]')) {
            cms.push({
                category: '内容管理系统',
                name: 'Joomla',
                version: 'unknown',
                purpose: '内容管理',
                vendor: 'Open Source Matters'
            });
        }

        // Shopify检测
        if (document.querySelector('script[src*="shopify"]') ||
            document.querySelector('link[href*="shopify"]') ||
            window.Shopify) {
            cms.push({
                category: '电商平台',
                name: 'Shopify',
                version: 'unknown',
                purpose: '电子商务',
                vendor: 'Shopify Inc.'
            });
        }

        return cms;
    });
}

/**
 * 检测分析工具
 */
async function detectAnalytics() {
    const analytics = [];
    
    networkRequests.forEach(request => {
        if (request.url.includes('google-analytics.com') || 
            request.url.includes('googletagmanager.com')) {
            analytics.push({
                category: '网站分析',
                name: 'Google Analytics',
                version: 'unknown',
                purpose: '用户行为分析',
                vendor: 'Google'
            });
        }

        if (request.url.includes('hotjar.com')) {
            analytics.push({
                category: '用户体验分析',
                name: 'Hotjar',
                version: 'unknown',
                purpose: '用户行为热图',
                vendor: 'Hotjar Ltd.'
            });
        }

        if (request.url.includes('mixpanel.com')) {
            analytics.push({
                category: '产品分析',
                name: 'Mixpanel',
                version: 'unknown',
                purpose: '事件追踪分析',
                vendor: 'Mixpanel Inc.'
            });
        }
    });

    return deduplicateServices(analytics);
}

/**
 * 检测安全特性
 */
async function detectSecurity() {
    const security = [];
    
    networkResponses.forEach(response => {
        const headers = response.headers;
        
        if (headers['strict-transport-security']) {
            security.push({
                category: '安全协议',
                name: 'HSTS',
                version: 'unknown',
                purpose: 'HTTPS强制',
                vendor: 'W3C Standard'
            });
        }

        if (headers['content-security-policy']) {
            security.push({
                category: '安全策略',
                name: 'CSP',
                version: 'unknown',
                purpose: 'XSS防护',
                vendor: 'W3C Standard'
            });
        }

        if (headers['x-frame-options']) {
            security.push({
                category: '安全头',
                name: 'X-Frame-Options',
                version: 'unknown',
                purpose: '点击劫持防护',
                vendor: 'W3C Standard'
            });
        }

        if (headers['x-xss-protection']) {
            security.push({
                category: '安全头',
                name: 'X-XSS-Protection',
                version: 'unknown',
                purpose: 'XSS过滤器',
                vendor: 'Browser Standard'
            });
        }
    });

    return deduplicateServices(security);
}

/**
 * 检测托管服务
 */
async function detectHosting() {
    const hosting = [];
    
    networkResponses.forEach(response => {
        const headers = response.headers;
        
        if (headers['server'] && headers['server'].includes('GitHub.com')) {
            hosting.push({
                category: '托管服务',
                name: 'GitHub Pages',
                version: 'unknown',
                purpose: '静态网站托管',
                vendor: 'GitHub Inc.'
            });
        }

        if (headers['x-served-by'] && headers['x-served-by'].includes('cache')) {
            hosting.push({
                category: '托管服务',
                name: 'CDN Hosting',
                version: 'unknown',
                purpose: '内容分发',
                vendor: 'unknown'
            });
        }

        if (headers['x-vercel-id']) {
            hosting.push({
                category: '托管服务',
                name: 'Vercel',
                version: 'unknown',
                purpose: '前端部署平台',
                vendor: 'Vercel Inc.'
            });
        }

        if (headers['x-nf-request-id']) {
            hosting.push({
                category: '托管服务',
                name: 'Netlify',
                version: 'unknown',
                purpose: 'Jamstack部署',
                vendor: 'Netlify Inc.'
            });
        }
    });

    return deduplicateServices(hosting);
}

/**
 * 获取性能信息
 */
async function getPerformanceInfo(page) {
    return await page.evaluate(() => {
        const performance = window.performance;
        if (performance && performance.timing) {
            const timing = performance.timing;
            const navigation = performance.getEntriesByType('navigation')[0];
            
            const performanceData = {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstByte: timing.responseStart - timing.requestStart,
                domProcessing: timing.domComplete - timing.domLoading
            };

            // 获取First Paint和First Contentful Paint
            const paintEntries = performance.getEntriesByType('paint');
            paintEntries.forEach(entry => {
                if (entry.name === 'first-paint') {
                    performanceData.firstPaint = entry.startTime;
                }
                if (entry.name === 'first-contentful-paint') {
                    performanceData.firstContentfulPaint = entry.startTime;
                }
            });

            // Core Web Vitals
            if (navigation) {
                performanceData.transferSize = navigation.transferSize;
                performanceData.encodedBodySize = navigation.encodedBodySize;
                performanceData.decodedBodySize = navigation.decodedBodySize;
            }

            return performanceData;
        }
        return null;
    });
}

/**
 * 解析服务器头信息
 */
function parseServerHeader(serverHeader) {
    const patterns = [
        { regex: /nginx\/([0-9.]+)/i, name: 'Nginx' },
        { regex: /Apache\/([0-9.]+)/i, name: 'Apache' },
        { regex: /Microsoft-IIS\/([0-9.]+)/i, name: 'IIS' },
        { regex: /LiteSpeed\/([0-9.]+)/i, name: 'LiteSpeed' },
        { regex: /OpenResty\/([0-9.]+)/i, name: 'OpenResty' },
        { regex: /Caddy\/([0-9.]+)/i, name: 'Caddy' }
    ];

    for (const pattern of patterns) {
        const match = serverHeader.match(pattern.regex);
        if (match) {
            return {
                name: pattern.name,
                version: match[1]
            };
        }
    }

    // 如果没有版本号，只返回服务器名称
    if (serverHeader.toLowerCase().includes('nginx')) {
        return { name: 'Nginx', version: 'unknown' };
    }
    if (serverHeader.toLowerCase().includes('apache')) {
        return { name: 'Apache', version: 'unknown' };
    }

    return null;
}

/**
 * 根据服务器名称获取供应商
 */
function getVendorByServer(serverName) {
    const vendors = {
        'Nginx': 'Nginx Inc.',
        'Apache': 'Apache Software Foundation',
        'IIS': 'Microsoft Corporation',
        'LiteSpeed': 'LiteSpeed Technologies',
        'OpenResty': 'OpenResty Inc.',
        'Caddy': 'Light Code Labs'
    };
    return vendors[serverName] || 'unknown';
}

/**
 * 去重服务列表
 */
function deduplicateServices(services) {
    const seen = new Set();
    return services.filter(service => {
        const key = `${service.name}-${service.category}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

/**
 * 生成技术信息报告
 */
export function generateReport(techInfo) {
    console.log('\n=== 网站技术分析报告 ===');
    console.log(`网站: ${techInfo.url}`);
    console.log(`分析时间: ${techInfo.timestamp}\n`);
    
    const categories = [
        { key: 'software', name: '软件系统' },
        { key: 'webServices', name: '网络服务' },
        { key: 'frameworks', name: '前端框架' },
        { key: 'libraries', name: '第三方库' },
        { key: 'cms', name: '内容管理系统' },
        { key: 'analytics', name: '分析工具' },
        { key: 'security', name: '安全特性' },
        { key: 'hosting', name: '托管服务' }
    ];
    
    categories.forEach(category => {
        if (techInfo[category.key] && techInfo[category.key].length > 0) {
            console.log(`${category.name}:`);
            techInfo[category.key].forEach(item => {
                console.log(`  - ${item.name} ${item.version !== 'unknown' ? `(v${item.version})` : ''}`);
                console.log(`    类别: ${item.category}`);
                console.log(`    用途: ${item.purpose}`);
                console.log(`    供应商: ${item.vendor}`);
                console.log('');
            });
        }
    });
    
    if (techInfo.performance) {
        console.log('性能信息:');
        console.log(`  页面加载时间: ${techInfo.performance.loadTime}ms`);
        console.log(`  DOM就绪时间: ${techInfo.performance.domReady}ms`);
        console.log(`  首字节时间: ${techInfo.performance.firstByte}ms`);
        if (techInfo.performance.firstPaint) {
            console.log(`  首次绘制时间: ${techInfo.performance.firstPaint.toFixed(2)}ms`);
        }
        if (techInfo.performance.firstContentfulPaint) {
            console.log(`  首次内容绘制: ${techInfo.performance.firstContentfulPaint.toFixed(2)}ms`);
        }
    }

    if (techInfo.hardware && techInfo.hardware.length > 0) {
        console.log('\n硬件信息:');
        techInfo.hardware.forEach(item => {
            console.log(`  - ${item.name}: ${item.version}`);
        });
    }
}

// 使用示例
export async function runExample(url: string) {
    try {
        const techInfo = await getTechInfo(url, {
            headless: true,
            timeout: 30000
        });
        
        console.log('网站技术信息:', JSON.stringify(techInfo, null, 2));
        generateReport(techInfo);
    } catch (error) {
        console.error('Error:', error);
    }
}