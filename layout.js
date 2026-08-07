// ==========================================
// CHỨC NĂNG ĐỔI NGÔN NGỮ (GLOBAL LANGUAGE SWITCHER)
// ==========================================
window.toggleLanguage = function () {
    var isEn = document.cookie.indexOf('/en') !== -1;
    var host = location.hostname;
    var rootDomain = host.replace(/^www\./, '');

    if (isEn) {
        var pastDate = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
        document.cookie = "googtrans=; " + pastDate;
        document.cookie = "googtrans=; domain=" + host + "; " + pastDate;
        document.cookie = "googtrans=; domain=." + rootDomain + "; " + pastDate;
    } else {
        document.cookie = "googtrans=/vi/en; path=/;";
        document.cookie = "googtrans=/vi/en; path=/; domain=" + host + ";";
        document.cookie = "googtrans=/vi/en; path=/; domain=." + rootDomain + ";";
    }
    location.reload();
};

window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
        pageLanguage: 'vi',
        includedLanguages: 'en,vi',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
    }, 'google_translate_element');
};

// ==========================================
// HÀM HỖ TRỢ CHẠY LẠI SCRIPT TRONG NỘI DUNG MỚI NẠP
// ==========================================
function reexecuteScripts(container) {
    if (!container) return;
    const scripts = container.querySelectorAll('script');
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.src) {
            newScript.src = oldScript.src;
        } else {
            newScript.textContent = oldScript.textContent;
        }
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}

// ==========================================
// BỘ NHỚ TẠM (TAB CACHE) & CLIENT-SIDE ROUTER
// ==========================================
const tabCache = {};

function updateActiveTab(pageId) {
    const allTabs = document.querySelectorAll('[data-tab]');
    allTabs.forEach(el => {
        if (el.classList.contains('nav-tab-btn')) {
            el.classList.remove('border-brand-blue', 'text-brand-blue');
            el.classList.add('border-transparent', 'text-slate-600');
        }
        if (el.classList.contains('mobile-tab-btn')) {
            el.classList.remove('text-brand-blue', 'bg-blue-50');
            el.classList.add('text-slate-700');
        }
    });

    const activeTabs = document.querySelectorAll(`[data-tab="${pageId}"]`);
    activeTabs.forEach(el => {
        if (el.classList.contains('nav-tab-btn')) {
            el.classList.add('border-brand-blue', 'text-brand-blue');
            el.classList.remove('border-transparent', 'text-slate-600');
        }
        if (el.classList.contains('mobile-tab-btn')) {
            el.classList.add('text-brand-blue', 'bg-blue-50');
            el.classList.remove('text-slate-700');
        }
    });
}

function initClientRouter() {
    if (window._routerInitialized) return;
    window._routerInitialized = true;

    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        const isHomePage = href === 'index.html' || href === '/' || href.endsWith('/index.html');

        // Luôn luôn tải lại toàn bộ trang khi click vào Trang chủ
        if (isHomePage) {
            e.preventDefault();
            const currentPath = window.location.pathname;
            if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath === '') {
                window.location.reload();
            } else {
                window.location.href = '/index.html';
            }
            return;
        }

        if (href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('#') && link.target !== '_blank') {
            e.preventDefault();
            const targetUrl = new URL(href, window.location.origin).pathname;
            if (window.location.pathname === targetUrl) return;

            await navigateToPage(targetUrl);
        }
    });

    window.addEventListener('popstate', () => {
        navigateToPage(window.location.pathname, false);
    });
}

async function navigateToPage(url, pushState = true) {
    const mainContent = document.querySelector('main');

    // 1. Hiệu ứng Fade Out mượt mà (0.15s)
    if (mainContent) {
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(4px)';
        mainContent.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    }

    setTimeout(async () => {
        try {
            let htmlText = tabCache[url];

            if (!htmlText) {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Không thể tải trang');
                htmlText = await response.text();
                tabCache[url] = htmlText; // Lưu cache
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const newMain = doc.querySelector('main');
            const newTitle = doc.querySelector('title');

            // 2. Thay đổi ruột <main> & Tiêu đề
            if (newMain && mainContent) {
                mainContent.innerHTML = newMain.innerHTML;
                reexecuteScripts(mainContent);
            }
            if (newTitle) {
                document.title = newTitle.text;
            }

            // 3. Cập nhật Tab Active
            const pageId = url.split('/').pop().replace('.html', '') || 'index';
            updateActiveTab(pageId);

            if (pushState) {
                window.history.pushState({}, '', url);
            }

            closeMobileMenu();
            window.scrollTo({ top: 0, behavior: 'instant' });

            // 4. Kích hoạt lại JS riêng từng tab
            if ((pageId === 'about' || url.includes('about')) && typeof window.initAboutPage === 'function') {
                window.initAboutPage();
            }

            if (pageId === 'index' || pageId === '' || url.includes('index')) {
                loadHomeNews();
                if (typeof window.initHomeSlider === 'function') {
                    window.initHomeSlider();
                }
            }
            initVisitorCounter();

            // Phát sự kiện cập nhật giao diện
            window.dispatchEvent(new Event('DOMContentLoaded'));
            window.dispatchEvent(new Event('scroll'));

            if (typeof AOS !== 'undefined') {
                AOS.refreshHard();
            }

            // 5. Hiệu ứng Fade In nội dung mới
            if (mainContent) {
                mainContent.style.opacity = '1';
                mainContent.style.transform = 'translateY(0)';
            }

        } catch (error) {
            console.error('Lỗi chuyển tab:', error);
            window.location.href = url;
        }
    }, 150);
}

// ==========================================
// NẠP HEADER / FOOTER DỰ ÁN
// ==========================================
async function loadLayout(pageId) {
    try {
        if (!document.querySelector('header')) {
            const [headerRes, footerRes] = await Promise.all([
                fetch('/header.html'),
                fetch('/footer.html')
            ]);

            const headerHtml = await headerRes.text();
            const footerHtml = await footerRes.text();

            const headerPlaceholder = document.getElementById('header-placeholder');
            if (headerPlaceholder) {
                headerPlaceholder.outerHTML = headerHtml;
            }

            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = footerHtml;
            }

            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                });
            }

            initClientRouter();
        }

        updateActiveTab(pageId);

    } catch (error) {
        console.error('Lỗi khi nạp Header/Footer:', error);
    }
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
}

// ==========================================
// TỰ ĐỘNG LẤY TIN TỨC CHO INDEX.HTML
// ==========================================
async function loadHomeNews() {
    const placeholder = document.getElementById('latest-news-placeholder');
    if (!placeholder) return;

    try {
        const response = await fetch('/news.html');
        const htmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const newsContent = doc.querySelector('#news-container');

        if (newsContent) {
            placeholder.innerHTML = newsContent.innerHTML;
        }
    } catch (error) {
        console.error('Lỗi đồng bộ tin tức:', error);
    }
}

// ==========================================
// GỬI FORM QUA AJAX
// ==========================================
async function submitContactForm(e) {
    e.preventDefault();

    const form = e.target;
    const thankYouModal = document.getElementById('thankYouModal');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Đang gửi...';

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            form.reset();
            if (thankYouModal) {
                thankYouModal.classList.remove('hidden');
                thankYouModal.classList.add('flex');
            }
        } else {
            alert('Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại!');
        }
    } catch (error) {
        alert('Không thể kết nối máy chủ. Vui lòng kiểm tra lại kết nối mạng!');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
    }
}

function closeModal() {
    const thankYouModal = document.getElementById('thankYouModal');
    if (thankYouModal) {
        thankYouModal.classList.add('hidden');
        thankYouModal.classList.remove('flex');
    }
}

// ==========================================
// THỐNG KÊ LƯỢT TRUY CẬP
// ==========================================
async function initVisitorCounter() {
    const totalVisitsEl = document.getElementById('totalVisits');
    const onlineVisitorsEl = document.getElementById('onlineVisitors');

    if (!totalVisitsEl && !onlineVisitorsEl) return;

    const NAMESPACE = 'pvincons_construct_2026';
    const KEY = 'total_visits';

    try {
        let endpoint = `https://api.counterapi.dev/v1/${NAMESPACE}/${KEY}/`;

        if (!sessionStorage.getItem('pv_counted_session')) {
            endpoint += 'up/';
            sessionStorage.setItem('pv_counted_session', 'true');
        }

        const response = await fetch(endpoint);
        if (response.ok) {
            const data = await response.json();
            const BASE_OFFSET = 12000;
            const finalTotal = (data.count || 0) + BASE_OFFSET;
            if (totalVisitsEl) {
                totalVisitsEl.innerText = Number(finalTotal).toLocaleString('vi-VN');
            }
        } else {
            throw new Error('Lỗi phản hồi API');
        }
    } catch (error) {
        if (totalVisitsEl) {
            totalVisitsEl.innerText = '12.000';
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('google_translate_element')) {
        const translateDiv = document.createElement('div');
        translateDiv.id = 'google_translate_element';
        translateDiv.style.display = 'none';
        document.body.appendChild(translateDiv);

        const translateScript = document.createElement('script');
        translateScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(translateScript);
    }

    setTimeout(initVisitorCounter, 300);
    loadHomeNews();
});