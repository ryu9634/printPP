// API Base URL
const API_BASE_URL = 'http://localhost:8080/api';

// 전역 상태
const adminState = {
    categories: [],
    currentCategory: '',
    editingPost: null
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupNavigation();
    renderCategoriesTable();
    setupThumbnailUpload();
});

// 카테고리 로드
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        adminState.categories = await response.json();
        renderCategoriesTable();
        updateCategorySelects();
    } catch (error) {
        console.error('카테고리 로드 실패:', error);
        alert('카테고리를 불러오는데 실패했습니다.');
    }
}

// 네비게이션 설정
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            switchSection(section);
        });
    });
}

// 섹션 전환
function switchSection(sectionName) {
    // 네비게이션 활성화 상태 업데이트
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-section') === sectionName) {
            btn.classList.add('active');
        }
    });

    // 섹션 표시/숨김
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');

    // 해당 섹션 렌더링
    if (sectionName === 'categories') {
        renderCategoriesTable();
    } else if (sectionName === 'posts') {
        renderPostsGrid();
    }
}

// 카테고리 테이블 렌더링
function renderCategoriesTable() {
    const tbody = document.getElementById('categories-tbody');
    tbody.innerHTML = '';

    adminState.categories.forEach(category => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${category.id}</td>
            <td>${category.name}</td>
            <td><span class="badge ${category.type === 'default' ? 'badge-default' : 'badge-custom'}">${category.type === 'default' ? '기본' : '커스텀'}</span></td>
            <td>
                <div class="table-actions">
                    ${category.type !== 'default'
                        ? `<button class="btn btn-danger btn-sm" onclick="deleteCategory('${category.id}')">삭제</button>`
                        : '<span style="color: #999;">기본 카테고리</span>'
                    }
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 카테고리 선택 박스 업데이트
function updateCategorySelects() {
    const categoryFilter = document.getElementById('category-filter');
    const postCategory = document.getElementById('post-category');

    // 필터 셀렉트
    categoryFilter.innerHTML = '<option value="">모든 카테고리</option>';
    adminState.categories.forEach(cat => {
        if (cat.id !== 'main') {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        }
    });

    // 게시글 카테고리 셀렉트
    postCategory.innerHTML = '<option value="">선택하세요</option>';
    adminState.categories.forEach(cat => {
        if (cat.id !== 'main') {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            postCategory.appendChild(option);
        }
    });

    // 카테고리 필터 이벤트
    categoryFilter.addEventListener('change', (e) => {
        adminState.currentCategory = e.target.value;
        renderPostsGrid();
    });
}

// 게시글 그리드 렌더링
async function renderPostsGrid() {
    const grid = document.getElementById('posts-grid');
    const categoryId = adminState.currentCategory;

    try {
        // categoryId가 빈 문자열이면 모든 게시글 가져오기, 아니면 카테고리별 게시글 가져오기
        const url = categoryId
            ? `${API_BASE_URL}/posts/category/${categoryId}`
            : `${API_BASE_URL}/posts`;

        const response = await fetch(url);
        const posts = await response.json();

        if (posts.length === 0) {
            grid.innerHTML = '<div class="empty-state"><p>등록된 게시글이 없습니다</p></div>';
            return;
        }

        grid.innerHTML = posts.map(post => `
            <div class="post-card">
                <div class="post-card-image">
                    ${post.thumbnail
                        ? `<img src="${API_BASE_URL}/files/${post.thumbnail}" alt="${post.title}">`
                        : '<span>이미지 없음</span>'
                    }
                </div>
                <div class="post-card-content">
                    <h3 class="post-card-title">〈${post.title}〉</h3>
                    <p class="post-card-details">${post.year}, ${post.medium}, ${post.size}</p>
                    <div class="post-card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editPost(${post.id})">수정</button>
                        <button class="btn btn-danger btn-sm" onclick="deletePost(${post.id})">삭제</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('게시글 로드 실패:', error);
        grid.innerHTML = '<div class="empty-state"><p>게시글을 불러오는데 실패했습니다</p></div>';
    }
}

// 모달 표시
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

// 모달 닫기
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');

    if (modalId === 'category-modal') {
        document.getElementById('category-form').reset();
    } else if (modalId === 'post-modal') {
        document.getElementById('post-form').reset();
        document.getElementById('additional-images').innerHTML = '';
        adminState.editingPost = null;
    }
}

// 카테고리 추가 모달 표시
function showAddCategoryModal() {
    showModal('category-modal');
}

// 카테고리 추가 처리
async function handleAddCategory(event) {
    event.preventDefault();

    const id = document.getElementById('category-id').value.toLowerCase().trim();
    const name = document.getElementById('category-name').value.trim();

    try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, type: 'custom' })
        });

        if (response.ok) {
            await loadCategories();
            closeModal('category-modal');
            alert('카테고리가 추가되었습니다!');
        } else {
            const errorText = await response.text();
            console.error('카테고리 추가 실패:', errorText);
            alert(`카테고리 추가 실패: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('카테고리 추가 실패:', error);
        alert('카테고리 추가 중 오류가 발생했습니다: ' + error.message);
    }
}

// 카테고리 삭제
async function deleteCategory(categoryId) {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadCategories();
            alert('카테고리가 삭제되었습니다.');
        } else {
            alert('카테고리 삭제 실패');
        }
    } catch (error) {
        console.error('카테고리 삭제 실패:', error);
        alert('카테고리 삭제 중 오류가 발생했습니다.');
    }
}

// 게시글 추가 모달 표시
function showAddPostModal() {
    if (!adminState.currentCategory) {
        alert('먼저 카테고리를 선택해주세요.');
        return;
    }

    document.getElementById('post-modal-title').textContent = '새 게시글 추가';
    document.getElementById('post-form').reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-category').value = adminState.currentCategory;
    document.getElementById('additional-images').innerHTML = '';
    showModal('post-modal');
}

// 게시글 수정
async function editPost(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        const post = await response.json();

        adminState.editingPost = postId;
        document.getElementById('post-modal-title').textContent = '게시글 수정';
        document.getElementById('post-id').value = postId;
        document.getElementById('post-category').value = post.categoryId;
        document.getElementById('post-title').value = post.title;
        document.getElementById('post-year').value = post.year;
        document.getElementById('post-medium').value = post.medium;
        document.getElementById('post-size').value = post.size;
        document.getElementById('post-thumbnail').value = post.thumbnail || '';
        document.getElementById('post-description').value = post.description || '';

        const additionalImages = document.getElementById('additional-images');
        additionalImages.innerHTML = '';
        if (post.images && post.images.length > 0) {
            post.images.forEach(img => addImageInput(img));
        }

        showModal('post-modal');
    } catch (error) {
        console.error('게시글 로드 실패:', error);
        alert('게시글을 불러오는데 실패했습니다.');
    }
}

// 파일 업로드
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('파일 업로드 실패');
    const result = await response.json();
    return result.fileName;
}

// 썸네일 업로드 설정
function setupThumbnailUpload() {
    const thumbnailInput = document.getElementById('post-thumbnail');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'thumbnail-file';

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn btn-secondary btn-sm';
    uploadBtn.textContent = '파일 선택';
    uploadBtn.style.marginTop = '0.5rem';
    uploadBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                uploadBtn.textContent = '업로드 중...';
                uploadBtn.disabled = true;
                const fileName = await uploadImage(file);
                thumbnailInput.value = fileName;
                alert('파일이 업로드되었습니다!');
            } catch (error) {
                alert('파일 업로드에 실패했습니다.');
            } finally {
                uploadBtn.textContent = '파일 선택';
                uploadBtn.disabled = false;
            }
        }
    };

    thumbnailInput.parentElement.appendChild(fileInput);
    thumbnailInput.parentElement.appendChild(uploadBtn);
}

// 이미지 입력 필드 추가
function addImageInput(value = '') {
    const container = document.getElementById('additional-images');
    const div = document.createElement('div');
    div.className = 'image-input-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'additional-image-url';
    input.value = value;
    input.placeholder = '파일명';
    input.readOnly = true;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'btn btn-secondary btn-sm';
    selectBtn.textContent = '파일 선택';
    selectBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                selectBtn.textContent = '업로드 중...';
                selectBtn.disabled = true;
                const fileName = await uploadImage(file);
                input.value = fileName;
            } catch (error) {
                alert('파일 업로드에 실패했습니다.');
            } finally {
                selectBtn.textContent = '파일 선택';
                selectBtn.disabled = false;
            }
        }
    };

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-image';
    removeBtn.textContent = '삭제';
    removeBtn.onclick = () => div.remove();

    div.appendChild(input);
    div.appendChild(fileInput);
    div.appendChild(selectBtn);
    div.appendChild(removeBtn);
    container.appendChild(div);
}

// 게시글 저장
async function handleSavePost(event) {
    event.preventDefault();

    const postId = document.getElementById('post-id').value;
    const postData = {
        categoryId: document.getElementById('post-category').value,
        title: document.getElementById('post-title').value,
        year: document.getElementById('post-year').value,
        medium: document.getElementById('post-medium').value,
        size: document.getElementById('post-size').value,
        thumbnail: document.getElementById('post-thumbnail').value,
        description: document.getElementById('post-description').value,
        images: Array.from(document.querySelectorAll('.additional-image-url'))
            .map(input => input.value)
            .filter(url => url.trim() !== '')
    };

    try {
        const url = postId ? `${API_BASE_URL}/posts/${postId}` : `${API_BASE_URL}/posts`;
        const method = postId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });

        if (response.ok) {
            closeModal('post-modal');
            await renderPostsGrid();
            alert('게시글이 저장되었습니다!');
        } else {
            alert('게시글 저장 실패');
        }
    } catch (error) {
        console.error('게시글 저장 실패:', error);
        alert('게시글 저장 중 오류가 발생했습니다.');
    }
}

// 게시글 삭제
async function deletePost(postId) {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await renderPostsGrid();
            alert('게시글이 삭제되었습니다.');
        } else {
            alert('게시글 삭제 실패');
        }
    } catch (error) {
        console.error('게시글 삭제 실패:', error);
        alert('게시글 삭제 중 오류가 발생했습니다.');
    }
}

// 모달 외부 클릭시 닫기
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}
