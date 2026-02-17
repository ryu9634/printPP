// API Base URL (상대 경로 사용 - 로컬/배포 환경 모두 호환)
const API_BASE_URL = '/api';

// 전역 상태 관리
const appState = {
    currentPage: 'main',
    categories: [],
    posts: {}
};

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    setupNavigation();
    renderPage('main');
    setupBackToTop();
});

// 카테고리 로드
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        appState.categories = await response.json();
        renderSidebar();
    } catch (error) {
        console.error('카테고리 로드 실패:', error);
        appState.categories = [
            { id: 'main', name: 'Jae Hoon Jeoung', type: 'default' },
            { id: 'artwork', name: 'Art work', type: 'default' },
            { id: 'cv', name: 'CV', type: 'default' }
        ];
        renderSidebar();
    }
}

// 카테고리별 게시글 로드
async function loadPostsByCategory(categoryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/category/${categoryId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const posts = await response.json();
        appState.posts[categoryId] = posts;
        return posts;
    } catch (error) {
        console.error(`게시글 로드 실패 (${categoryId}):`, error);
        return null;
    }
}

// 사이드바 렌더링
function renderSidebar() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.innerHTML = '';

    const mainCategory = appState.categories.find(cat => cat.id === 'main');
    if (mainCategory) {
        const li = document.createElement('li');
        li.textContent = 'Jae Hoon Jeoung';
        li.setAttribute('data-page', 'main');
        li.style.cursor = 'pointer';
        if (appState.currentPage === 'main') {
            li.classList.add('active');
        }
        navMenu.appendChild(li);
    }

    appState.categories.forEach(category => {
        if (category.id !== 'main') {
            const li = document.createElement('li');
            li.textContent = category.name;
            li.setAttribute('data-page', category.id);
            li.style.cursor = 'pointer';

            if (category.id === appState.currentPage) {
                li.classList.add('active');
            }

            navMenu.appendChild(li);
        }
    });
}

// 네비게이션 설정
function setupNavigation() {
    document.querySelector('.nav-menu').addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const page = e.target.getAttribute('data-page');
            renderPage(page);
        }
    });
}

// 페이지 렌더링
async function renderPage(page) {
    appState.currentPage = page;

    // 활성 메뉴 업데이트
    document.querySelectorAll('.nav-menu li').forEach(li => {
        li.classList.remove('active');
        if (li.getAttribute('data-page') === page) {
            li.classList.add('active');
        }
    });

    const contentDiv = document.getElementById('page-content');

    if (page === 'main') {
        contentDiv.style.opacity = '0';
        contentDiv.innerHTML = '<div class="main-page"></div>';
        requestAnimationFrame(() => { contentDiv.style.opacity = '1'; });
    } else {
        // 로딩 스피너 표시
        contentDiv.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

        const posts = await loadPostsByCategory(page);

        contentDiv.style.opacity = '0';
        if (posts === null) {
            contentDiv.innerHTML = `
                <div class="error-state">
                    <p>콘텐츠를 불러오는 데 실패했습니다.</p>
                    <button onclick="renderPage('${page}')" class="retry-btn">다시 시도</button>
                </div>`;
        } else {
            renderPostsPage(contentDiv, posts);
        }
        requestAnimationFrame(() => { contentDiv.style.opacity = '1'; });
    }
}

// 게시글 페이지 렌더링
function renderPostsPage(container, posts) {
    const html = `
        <div class="artwork-container">
            <div class="artwork-grid">
                ${posts.length === 0
                    ? '<div class="empty-state"><p>등록된 게시글이 없습니다</p></div>'
                    : posts.map(post => `
                        <div class="artwork-item" data-id="${post.id}" style="cursor: pointer;">
                            <div class="artwork-image-placeholder">
                                ${post.thumbnail
                                    ? `<img src="${API_BASE_URL}/files/${post.thumbnail}" alt="${escapeHtml(post.title)}" loading="lazy">`
                                    : '<div class="placeholder-text">Image</div>'
                                }
                            </div>
                            <div class="artwork-info">
                                <h2 class="artwork-title">${escapeHtml(post.title)}</h2>
                                <p class="artwork-details">
                                    ${escapeHtml(post.year)}, ${escapeHtml(post.medium)}, ${escapeHtml(post.size)}
                                </p>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    container.innerHTML = html;

    // 게시글 클릭 이벤트 추가
    container.querySelectorAll('.artwork-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.getAttribute('data-id'));
            showPostDetail(id, posts);
        });
    });
}

// 게시글 상세 페이지 표시
function showPostDetail(id, posts) {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const modal = createModal();
    let contentHtml = '';

    if (post.contentType === 'PHOTO') {
        showPhotoSlideshow(modal, post);
        return;
    } else if (post.contentType === 'ARTICLE') {
        let articleContent = '';
        if (post.description) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.style.display = 'none';
                document.body.appendChild(tempDiv);

                const tempQuill = new Quill(tempDiv, { readOnly: true });
                const delta = JSON.parse(post.description);
                tempQuill.setContents(delta);
                articleContent = tempQuill.root.innerHTML;

                document.body.removeChild(tempDiv);
            } catch (e) {
                console.error('Quill 데이터 파싱 실패:', e);
                articleContent = `<p>${escapeHtml(post.description)}</p>`;
            }
        }

        contentHtml = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                ${post.thumbnail ? `<img src="${API_BASE_URL}/files/${post.thumbnail}" alt="${escapeHtml(post.title)}" style="max-width: 100%; margin-bottom: 1rem;" loading="lazy">` : ''}
                <h2>${escapeHtml(post.title)}</h2>
                <p>${escapeHtml(post.year)}, ${escapeHtml(post.medium)}, ${escapeHtml(post.size)}</p>
                <div class="article-content">
                    ${articleContent}
                </div>
            </div>
        `;
    } else if (post.contentType === 'HTML') {
        contentHtml = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="html-content">
                    <iframe id="html-sandbox" sandbox="allow-same-origin"
                        style="width:100%; border:none; min-height:400px;"></iframe>
                </div>
            </div>
        `;
    }

    modal.innerHTML = contentHtml;
    document.body.appendChild(modal);

    // HTML 타입이면 iframe에 콘텐츠 삽입 (XSS 방지)
    if (post.contentType === 'HTML' && post.htmlContent) {
        const iframe = modal.querySelector('#html-sandbox');
        if (iframe) {
            const doc = iframe.contentDocument;
            doc.open();
            doc.write(post.htmlContent);
            doc.close();
            iframe.onload = () => {
                iframe.style.height = doc.body.scrollHeight + 'px';
            };
            iframe.style.height = doc.body.scrollHeight + 'px';
        }
    }

    setupModalClose(modal);
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 모달 생성
function createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        display: block;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0,0,0,0.9);
    `;
    return modal;
}

// 모달 닫기 설정
function setupModalClose(modal) {
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.style.cssText = `
        color: #fff;
        position: fixed;
        top: 1rem;
        right: 1.5rem;
        font-size: 36px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1001;
        padding: 10px;
        line-height: 1;
    `;

    closeBtn.onclick = () => modal.remove();
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// 포토 슬라이드쇼 표시
function showPhotoSlideshow(modal, post) {
    const slides = [];

    // 첫 번째 슬라이드: 썸네일 + 타이틀 + 설명
    slides.push({
        type: 'intro',
        thumbnail: post.thumbnail,
        title: post.title,
        year: post.year,
        medium: post.medium,
        size: post.size,
        description: post.description
    });

    // 추가 이미지 슬라이드
    if (post.images && post.images.length > 0) {
        post.images.forEach(img => {
            slides.push({
                type: 'image',
                imageUrl: img.imageUrl,
                imageDescription: img.imageDescription
            });
        });
    }

    let currentSlide = 0;

    function renderSlide(index) {
        const slide = slides[index];
        const slideContainer = modal.querySelector('.slideshow-slide');
        if (!slideContainer) return;

        slideContainer.style.opacity = '0';
        setTimeout(() => {
            if (slide.type === 'intro') {
                slideContainer.innerHTML = `
                    <div class="slide-intro">
                        ${slide.thumbnail
                            ? `<div class="slide-intro-image"><img src="${API_BASE_URL}/files/${slide.thumbnail}" alt="${escapeHtml(slide.title)}" loading="lazy"></div>`
                            : ''
                        }
                        <div class="slide-intro-info">
                            <h2 class="slide-title">${escapeHtml(slide.title)}</h2>
                            <p class="slide-meta">${escapeHtml(slide.year)}, ${escapeHtml(slide.medium)}, ${escapeHtml(slide.size)}</p>
                            ${slide.description ? `<div class="slide-description">${escapeHtml(slide.description)}</div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                slideContainer.innerHTML = `
                    <div class="slide-image-view">
                        <div class="slide-image-wrapper">
                            <img src="${API_BASE_URL}/files/${slide.imageUrl}" alt="" loading="lazy">
                        </div>
                        ${slide.imageDescription ? `<p class="slide-image-desc">${escapeHtml(slide.imageDescription)}</p>` : ''}
                    </div>
                `;
            }
            slideContainer.style.opacity = '1';
        }, 200);

        // 도트 인디케이터 업데이트
        modal.querySelectorAll('.slideshow-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        // 화살표 표시/숨김
        const prevBtn = modal.querySelector('.slide-prev');
        const nextBtn = modal.querySelector('.slide-next');
        if (prevBtn) prevBtn.style.display = index === 0 ? 'none' : 'flex';
        if (nextBtn) nextBtn.style.display = index === slides.length - 1 ? 'none' : 'flex';
    }

    function goToSlide(index) {
        if (index < 0 || index >= slides.length) return;
        currentSlide = index;
        renderSlide(currentSlide);
    }

    // 슬라이드쇼 HTML 생성
    const dotsHtml = slides.length > 1
        ? `<div class="slideshow-dots">${slides.map((_, i) => `<span class="slideshow-dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`).join('')}</div>`
        : '';

    modal.innerHTML = `
        <div class="slideshow-container">
            <span class="close-modal">&times;</span>
            ${slides.length > 1 ? '<button class="slide-prev" style="display:none;">&#10094;</button>' : ''}
            <div class="slideshow-slide"></div>
            ${slides.length > 1 ? '<button class="slide-next">&#10095;</button>' : ''}
            ${dotsHtml}
            ${slides.length > 1 ? `<div class="slide-counter"><span class="slide-current">1</span> / ${slides.length}</div>` : ''}
        </div>
    `;
    document.body.appendChild(modal);

    // 첫 슬라이드 렌더링
    renderSlide(0);

    // 네비게이션 이벤트
    const prevBtn = modal.querySelector('.slide-prev');
    const nextBtn = modal.querySelector('.slide-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(currentSlide - 1);
            updateCounter();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(currentSlide + 1);
            updateCounter();
        });
    }

    // 도트 클릭
    modal.querySelectorAll('.slideshow-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(parseInt(dot.getAttribute('data-index')));
            updateCounter();
        });
    });

    function updateCounter() {
        const counter = modal.querySelector('.slide-current');
        if (counter) counter.textContent = currentSlide + 1;
    }

    // 키보드 네비게이션
    const keyHandler = (e) => {
        if (e.key === 'ArrowLeft') {
            goToSlide(currentSlide - 1);
            updateCounter();
        } else if (e.key === 'ArrowRight') {
            goToSlide(currentSlide + 1);
            updateCounter();
        } else if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', keyHandler);
        }
    };
    document.addEventListener('keydown', keyHandler);

    // 터치 스와이프
    let touchStartX = 0;
    let touchEndX = 0;
    modal.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    modal.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                goToSlide(currentSlide + 1);
            } else {
                goToSlide(currentSlide - 1);
            }
            updateCounter();
        }
    }, { passive: true });

    // 닫기 이벤트
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.style.cssText = `
        color: #fff;
        position: fixed;
        top: 1rem;
        right: 1.5rem;
        font-size: 36px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1002;
        padding: 10px;
        line-height: 1;
    `;
    closeBtn.onclick = () => {
        modal.remove();
        document.removeEventListener('keydown', keyHandler);
    };
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('slideshow-container')) {
            modal.remove();
            document.removeEventListener('keydown', keyHandler);
        }
    });
}

// Back-to-top 버튼
function setupBackToTop() {
    const backToTop = document.getElementById('back-to-top');
    if (!backToTop) return;

    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 300);
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
