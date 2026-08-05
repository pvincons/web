// ==========================================
// CHỨC NĂNG ĐỔI NGÔN NGỮ (GLOBAL LANGUAGE SWITCHER)
// ==========================================
window.toggleLanguage = function () {
    var isEn = document.cookie.indexOf('/en') !== -1;
    var host = location.hostname;
    var rootDomain = host.replace(/^www\./, '');

    if (isEn) {
        // Xóa Cookie trên mọi cấp độ Domain để quay về Tiếng Việt
        var pastDate = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
        document.cookie = "googtrans=; " + pastDate;
        document.cookie = "googtrans=; domain=" + host + "; " + pastDate;
        document.cookie = "googtrans=; domain=." + rootDomain + "; " + pastDate;
    } else {
        // Thiết lập Cookie chuyển sang Tiếng Anh
        document.cookie = "googtrans=/vi/en; path=/;";
        document.cookie = "googtrans=/vi/en; path=/; domain=" + host + ";";
        document.cookie = "googtrans=/vi/en; path=/; domain=." + rootDomain + ";";
    }
    location.reload();
};

// Khởi tạo Google Translate Widget ngầm
window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
        pageLanguage: 'vi',
        includedLanguages: 'en,vi',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
    }, 'google_translate_element');
};

// ==========================================
// CLIENT-SIDE ROUTER & HIỆU ỨNG CHUYỂN TAB MƯỢT
// ==========================================
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

        // Bắt các liên kết nội bộ file .html
        if (href && href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('#') && link.target !== '_blank') {
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

    // 1. Hiệu ứng Fade Out mượt mà cho nội dung cũ
    if (mainContent) {
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(6px)';
        mainContent.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Không thể tải trang');

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const newMain = doc.querySelector('main');
        const newTitle = doc.querySelector('title');

        setTimeout(() => {
            // 2. Thay đổi ruột <main> và Tiêu đề trang
            if (newMain && mainContent) {
                mainContent.innerHTML = newMain.innerHTML;
            }
            if (newTitle) {
                document.title = newTitle.text;
            }

            // 3. Cập nhật Tab active
            const pageId = url.split('/').pop().replace('.html', '') || 'index';
            updateActiveTab(pageId);

            if (pushState) {
                window.history.pushState({}, '', url);
            }

            // 4. Đóng mobile menu & cuộn mượt lên đầu
            closeMobileMenu();
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // 5. Nạp lại các tính năng phụ thuộc nội dung mới
            if (pageId === 'index' || pageId === '') {
                loadHomeNews();
            }
            initVisitorCounter();

            // 6. Hiệu ứng Fade In nội dung mới
            if (mainContent) {
                mainContent.style.opacity = '1';
                mainContent.style.transform = 'translateY(0)';
            }
        }, 200);

    } catch (error) {
        console.error('Lỗi chuyển trang mượt:', error);
        window.location.href = url; // Fallback điều hướng truyền thống nếu có lỗi
    }
}

// ==========================================
// NẠP HEADER / FOOTER DỰ ÁN
// ==========================================
async function loadLayout(pageId) {
    try {
        // Chỉ nạp Header/Footer 1 lần nếu chưa có
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

            // Sự kiện toggle Menu Mobile
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                });
            }

            // Khởi tạo router chuyển tab mượt
            initClientRouter();
        }

        // Highlight tab đang mở
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
// TỰ ĐỘNG LẤY TIN TỨC TỪ NEWS.HTML SANG INDEX.HTML
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
// GỬI DỮ LIỆU FORM QUA AJAX
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
            headers: {
                'Accept': 'application/json'
            }
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
// THỐNG KÊ LƯỢT TRUY CẬP THỰC TẾ (GLOBAL API)
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
        console.warn('API đếm toàn cầu bị gián đoạn, sử dụng số liệu fallback:', error);
        if (totalVisitsEl) {
            totalVisitsEl.innerText = '12.000';
        }
    }
}

// ==========================================
// THIẾT LẬP KHI TRANG TẢI XONG
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    // 1. Tự động chèn Container và Script cho Google Translate
    if (!document.getElementById('google_translate_element')) {
        const translateDiv = document.createElement('div');
        translateDiv.id = 'google_translate_element';
        translateDiv.style.display = 'none';
        document.body.appendChild(translateDiv);

        const translateScript = document.createElement('script');
        translateScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(translateScript);
    }

    // 2. Chạy các tính năng phụ trợ
    setTimeout(initVisitorCounter, 300);
    loadHomeNews();
});