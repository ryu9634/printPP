// API Base URL
const API_BASE_URL = 'http://localhost:8080/api';

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
});

// 카테고리 로드
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        appState.categories = await response.json();
        renderSidebar();
    } catch (error) {
        console.error('카테고리 로드 실패:', error);
        // 기본 카테고리 사용
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
        const posts = await response.json();
        appState.posts[categoryId] = posts;
        return posts;
    } catch (error) {
        console.error(`게시글 로드 실패 (${categoryId}):`, error);
        return [];
    }
}

// 사이드바 렌더링
function renderSidebar() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.innerHTML = '';

    // Main 카테고리는 작가 이름으로 표시
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

    // 나머지 카테고리 표시
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

    // 페이지 콘텐츠 렌더링
    const contentDiv = document.getElementById('page-content');

    if (page === 'main') {
        contentDiv.innerHTML = '<div class="main-page"></div>';
    } else {
        const posts = await loadPostsByCategory(page);
        renderPostsPage(contentDiv, posts);
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
                                    ? `<img src="${API_BASE_URL}/files/${post.thumbnail}" alt="${post.title}">`
                                    : '<div class="placeholder-text">Image</div>'
                                }
                            </div>
                            <div class="artwork-info">
                                <h2 class="artwork-title">〈${post.title}〉</h2>
                                <p class="artwork-details">
                                    ${post.year}, ${post.medium}, ${post.size}
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

    // 콘텐츠 타입별 렌더링
    if (post.contentType === 'PHOTO') {
        contentHtml = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>〈${post.title}〉</h2>
                <p>${post.year}, ${post.medium}, ${post.size}</p>
                ${post.description ? `<p class="description">${escapeHtml(post.description)}</p>` : ''}
                <div class="detail-images">
                    ${post.images && post.images.length > 0
                        ? post.images.map(img => `<img src="${API_BASE_URL}/files/${img}" alt="${post.title}">`).join('')
                        : '<p>추가 이미지가 없습니다.</p>'
                    }
                </div>
            </div>
        `;
    } else if (post.contentType === 'ARTICLE') {
        // Quill Delta JSON을 HTML로 변환
        let articleContent = '';
        if (post.description) {
            try {
                // Quill Delta를 HTML로 변환하기 위해 임시 Quill 인스턴스 사용
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
                ${post.thumbnail ? `<img src="${API_BASE_URL}/files/${post.thumbnail}" alt="${post.title}" style="max-width: 100%; margin-bottom: 1rem;">` : ''}
                <h2>〈${post.title}〉</h2>
                <p>${post.year}, ${post.medium}, ${post.size}</p>
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
                    ${post.htmlContent || '<p>콘텐츠가 없습니다.</p>'}
                </div>
            </div>
        `;
    }

    modal.innerHTML = contentHtml;
    document.body.appendChild(modal);
    setupModalClose(modal);
}

// HTML 이스케이프 함수
function escapeHtml(text) {
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
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
    `;

    closeBtn.onclick = () => modal.remove();
    window.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}
