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
        } else if (page === 'cv') {
            renderCvPage(contentDiv, posts);
        } else {
            renderPostsPage(contentDiv, posts);
        }
        requestAnimationFrame(() => { contentDiv.style.opacity = '1'; });
    }
}

// CV 페이지 렌더링 (PDF.js로 직접 렌더링)
function renderCvPage(container, posts) {
    const pdfPost = posts.find(p => p.thumbnail && p.thumbnail.toLowerCase().endsWith('.pdf'));

    if (!pdfPost) {
        if (posts.length > 0) {
            renderPostsPage(container, posts);
        } else {
            container.innerHTML = '<div class="empty-state"><p>CV가 등록되지 않았습니다</p></div>';
        }
        return;
    }

    container.innerHTML = '<div class="cv-pages" id="cv-pages-container"></div>';
    const pagesContainer = document.getElementById('cv-pages-container');

    const pdfUrl = `${API_BASE_URL}/files/${pdfPost.thumbnail}`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
        for (let i = 1; i <= pdf.numPages; i++) {
            pdf.getPage(i).then(page => {
                const scale = 2;
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.className = 'cv-page-canvas';
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const ctx = canvas.getContext('2d');
                page.render({ canvasContext: ctx, viewport }).promise.then(() => {
                    // 페이지 순서 보장
                    const pages = pagesContainer.querySelectorAll('.cv-page-canvas');
                    let inserted = false;
                    for (const existing of pages) {
                        if (parseInt(existing.dataset.page) > i) {
                            pagesContainer.insertBefore(canvas, existing);
                            inserted = true;
                            break;
                        }
                    }
                    if (!inserted) pagesContainer.appendChild(canvas);
                });
                canvas.dataset.page = i;
            });
        }
    }).catch(err => {
        console.error('PDF 로드 실패:', err);
        container.innerHTML = '<div class="empty-state"><p>CV를 불러올 수 없습니다</p></div>';
    });
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

    if (post.contentType === 'HTML') {
        renderHtmlDetail(modal, post);
    } else {
        renderSplitDetail(modal, post);
    }
}

// YouTube URL에서 비디오 ID 추출
function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// PHOTO/ARTICLE용 분할 레이아웃 렌더링
function renderSplitDetail(modal, post) {
    // 통합 미디어 리스트에서 아이템 수집
    const items = [];

    if (post.images && post.images.length > 0) {
        const sorted = [...post.images].sort((a, b) =>
            (a.displayOrder || 0) - (b.displayOrder || 0));

        sorted.forEach(img => {
            if (img.mediaType === 'VIDEO') {
                const videoId = extractYouTubeId(img.imageUrl);
                if (videoId) {
                    items.push({
                        type: 'video',
                        videoId: videoId,
                        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                        showDescription: img.showDescription !== false,
                        showImageDescription: img.showImageDescription || false,
                        descriptionPosition: img.descriptionPosition || 'right'
                    });
                }
            } else {
                items.push({
                    type: 'image',
                    url: `${API_BASE_URL}/files/${img.imageUrl}`,
                    description: img.imageDescription,
                    showDescription: img.showDescription !== false,
                    showImageDescription: img.showImageDescription || false,
                    descriptionPosition: img.descriptionPosition || 'right'
                });
            }
        });
    } else {
        // 하위호환: images 비어있으면 기존 thumbnail + videoUrl 폴백
        if (post.thumbnail) {
            items.push({
                type: 'image',
                url: `${API_BASE_URL}/files/${post.thumbnail}`,
                description: null,
                showDescription: true,
                descriptionPosition: 'right'
            });
        }
        if (post.videoUrl) {
            const videoId = extractYouTubeId(post.videoUrl);
            if (videoId) {
                items.push({
                    type: 'video',
                    videoId: videoId,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                    showDescription: false,
                    descriptionPosition: 'right'
                });
            }
        }
    }

    let selectedIndex = 0;

    // 설명 렌더링
    const descriptionHtml = renderDescription(post);

    // 좌측 썸네일 스트립 HTML
    const thumbsHtml = items.map((item, i) => `
        <div class="thumb-item ${i === 0 ? 'active' : ''}" data-index="${i}">
            ${item.type === 'video'
                ? `<img src="${item.thumbnailUrl}" alt="Video"><div class="thumb-play-icon">&#9654;</div>`
                : `<img src="${item.url}" alt="" loading="lazy">`
            }
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="detail-container">
            <span class="close-modal">&times;</span>
            <div class="detail-left">
                <div class="thumb-strip">
                    ${thumbsHtml}
                </div>
            </div>
            <div class="detail-right">
                <div class="detail-main-view"></div>
                <div class="detail-info">
                    <h2 class="detail-title">${escapeHtml(post.title)}</h2>
                    <p class="detail-meta">${escapeHtml(post.year)}, ${escapeHtml(post.medium)}, ${escapeHtml(post.size)}</p>
                    <div class="detail-description">
                        ${descriptionHtml}
                    </div>
                    <div class="detail-image-desc"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 첫 아이템 렌더링
    if (items.length > 0) {
        renderMainView(modal, items, 0);
    }

    // 썸네일 클릭 핸들러
    modal.querySelectorAll('.thumb-item').forEach(thumb => {
        thumb.addEventListener('click', () => {
            const index = parseInt(thumb.dataset.index);
            selectedIndex = index;
            renderMainView(modal, items, index);
            modal.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    // 메인 뷰 이미지 클릭 → 라이트박스
    modal.querySelector('.detail-main-view').addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('main-view-image')) {
            openLightbox(items, selectedIndex);
        }
    });

    setupModalClose(modal);
}

// 우측 메인 뷰 업데이트
function renderMainView(modal, items, index) {
    const mainView = modal.querySelector('.detail-main-view');
    const detailInfo = modal.querySelector('.detail-info');
    const detailRight = modal.querySelector('.detail-right');
    const imgDescArea = modal.querySelector('.detail-image-desc');
    const item = items[index];

    const hasImgDesc = item.showImageDescription && item.description;

    // 콘텐츠 HTML
    let contentHtml;
    if (item.type === 'video') {
        contentHtml = `
            <div class="main-video-wrapper">
                <iframe src="https://www.youtube.com/embed/${item.videoId}?rel=0"
                    frameborder="0" allowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
            </div>`;
    } else {
        contentHtml = `<img src="${item.url}" alt="" class="main-view-image" loading="lazy">`;
    }

    // 이미지 설명 하단 → 콘텐츠 아래에 직접 배치
    if (hasImgDesc && item.descriptionPosition === 'bottom') {
        mainView.innerHTML = `
            ${contentHtml}
            <p class="main-view-desc">${escapeHtml(item.description)}</p>
        `;
    } else {
        mainView.innerHTML = contentHtml;
    }

    // 이미지 설명 우측 → detail-info 영역 안에 표시 (메인 설명과 같은 패널)
    if (imgDescArea) {
        if (hasImgDesc && item.descriptionPosition === 'right') {
            imgDescArea.innerHTML = `<div class="image-desc-in-info">${escapeHtml(item.description)}</div>`;
            imgDescArea.style.display = '';
        } else {
            imgDescArea.innerHTML = '';
            imgDescArea.style.display = 'none';
        }
    }

    // 레이아웃 결정
    detailRight.classList.remove('layout-fullwidth', 'layout-right', 'layout-bottom');

    // 메인 설명 또는 이미지 설명 우측 → 우측 패널 표시
    const showRightPanel = item.showDescription || (hasImgDesc && item.descriptionPosition === 'right');

    if (showRightPanel) {
        detailRight.classList.add('layout-right');
        if (detailInfo) detailInfo.style.display = '';
    } else {
        detailRight.classList.add('layout-fullwidth');
        if (detailInfo) detailInfo.style.display = 'none';
    }

    // 메인 설명 콘텐츠 (제목/메타/설명) 숨김 처리
    const titleEl = modal.querySelector('.detail-title');
    const metaEl = modal.querySelector('.detail-meta');
    const descEl = modal.querySelector('.detail-description');
    if (titleEl) titleEl.style.display = item.showDescription ? '' : 'none';
    if (metaEl) metaEl.style.display = item.showDescription ? '' : 'none';
    if (descEl) descEl.style.display = item.showDescription ? '' : 'none';
}

// 설명 렌더링 (ARTICLE: Quill, PHOTO: 일반 텍스트)
function renderDescription(post) {
    if (post.contentType === 'ARTICLE' && post.description) {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.style.display = 'none';
            document.body.appendChild(tempDiv);
            const tempQuill = new Quill(tempDiv, { readOnly: true });
            const delta = JSON.parse(post.description);
            tempQuill.setContents(delta);
            const html = tempQuill.root.innerHTML;
            document.body.removeChild(tempDiv);
            return html;
        } catch (e) {
            console.error('Quill 데이터 파싱 실패:', e);
            return `<p>${escapeHtml(post.description)}</p>`;
        }
    } else if (post.description) {
        return `<p style="white-space: pre-wrap;">${escapeHtml(post.description)}</p>`;
    }
    return '';
}

// HTML 타입 전체 너비 렌더링
function renderHtmlDetail(modal, post) {
    modal.innerHTML = `
        <div class="detail-container detail-html-fullwidth">
            <span class="close-modal">&times;</span>
            <div class="detail-html-content">
                <iframe id="html-sandbox" sandbox="allow-same-origin"
                    style="width:100%; border:none; min-height:80vh;"></iframe>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    if (post.htmlContent) {
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

// 이미지 라이트박스
function openLightbox(items, startIndex) {
    const imageItems = items.filter(item => item.type === 'image');
    if (imageItems.length === 0) return;

    const startItem = items[startIndex];
    let currentIndex = imageItems.indexOf(startItem);
    if (currentIndex === -1) currentIndex = 0;

    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.innerHTML = `
        <span class="lightbox-close">&times;</span>
        ${imageItems.length > 1 ? '<button class="lightbox-prev">&#10094;</button>' : ''}
        <div class="lightbox-image-container">
            <img src="${imageItems[currentIndex].url}" alt="">
        </div>
        ${imageItems.length > 1 ? '<button class="lightbox-next">&#10095;</button>' : ''}
        ${imageItems.length > 1 ? `<div class="lightbox-counter">${currentIndex + 1} / ${imageItems.length}</div>` : ''}
    `;
    document.body.appendChild(lightbox);

    function updateLightbox() {
        lightbox.querySelector('.lightbox-image-container img').src = imageItems[currentIndex].url;
        const counter = lightbox.querySelector('.lightbox-counter');
        if (counter) counter.textContent = `${currentIndex + 1} / ${imageItems.length}`;
    }

    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');
    if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); currentIndex = (currentIndex - 1 + imageItems.length) % imageItems.length; updateLightbox(); };
    if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); currentIndex = (currentIndex + 1) % imageItems.length; updateLightbox(); };

    lightbox.querySelector('.lightbox-close').onclick = () => { lightbox.remove(); document.removeEventListener('keydown', lbKeyHandler); };
    lightbox.onclick = (e) => { if (e.target === lightbox) { lightbox.remove(); document.removeEventListener('keydown', lbKeyHandler); } };

    const lbKeyHandler = (e) => {
        if (e.key === 'Escape') { lightbox.remove(); document.removeEventListener('keydown', lbKeyHandler); }
        if (e.key === 'ArrowLeft' && prevBtn) { currentIndex = (currentIndex - 1 + imageItems.length) % imageItems.length; updateLightbox(); }
        if (e.key === 'ArrowRight' && nextBtn) { currentIndex = (currentIndex + 1) % imageItems.length; updateLightbox(); }
        e.stopPropagation();
    };
    document.addEventListener('keydown', lbKeyHandler);
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
