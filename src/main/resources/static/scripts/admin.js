// API Base URL (상대 경로 사용 - 로컬/배포 환경 모두 호환)
const API_BASE_URL = '/api';

// 전역 상태
const adminState = {
    categories: [],
    currentCategory: '',
    editingPost: null,
    quillEditor: null,
    hasUnsavedChanges: false
};

// ============================
// Toast 알림 시스템
// ============================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.addEventListener('click', () => removeToast(toast));
    container.appendChild(toast);

    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    if (!toast.parentElement) return;
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove());
}

// ============================
// 커스텀 확인 모달
// ============================
function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-modal-message');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        msgEl.textContent = message;
        overlay.classList.add('show');

        function cleanup() {
            overlay.classList.remove('show');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            overlay.removeEventListener('click', onOverlay);
        }

        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }
        function onOverlay(e) {
            if (e.target === overlay) { cleanup(); resolve(false); }
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onOverlay);
    });
}

// ============================
// 미저장 변경사항 추적
// ============================
function markUnsaved() {
    adminState.hasUnsavedChanges = true;
}

function clearUnsaved() {
    adminState.hasUnsavedChanges = false;
}

window.addEventListener('beforeunload', (e) => {
    if (adminState.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ============================
// 초기화
// ============================
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupNavigation();
    renderCategoriesTable();
    setupThumbnailUpload();
    setupCvPdfUpload();
    initializeQuillEditor();
    setupFormChangeTracking();
});

// 폼 변경사항 추적 설정
function setupFormChangeTracking() {
    const postForm = document.getElementById('post-form');
    postForm.addEventListener('input', markUnsaved);
    postForm.addEventListener('change', markUnsaved);
}

// ============================
// 카테고리 로드
// ============================
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        adminState.categories = await response.json();
        renderCategoriesTable();
        updateCategorySelects();
    } catch (error) {
        console.error('카테고리 로드 실패:', error);
        showToast('카테고리를 불러오는데 실패했습니다.', 'error');
    }
}

// 카테고리별 게시글 수 가져오기
async function fetchPostCounts() {
    const counts = {};
    for (const cat of adminState.categories) {
        if (cat.id === 'main') continue;
        try {
            const response = await fetch(`${API_BASE_URL}/posts/category/${cat.id}`);
            if (response.ok) {
                const posts = await response.json();
                counts[cat.id] = posts.length;
            }
        } catch (e) {
            counts[cat.id] = 0;
        }
    }
    return counts;
}

// ============================
// 네비게이션 설정
// ============================
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
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-section') === sectionName) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');

    if (sectionName === 'categories') {
        renderCategoriesTable();
    } else if (sectionName === 'posts') {
        renderPostsGrid();
    }
}

// ============================
// 카테고리 테이블 렌더링 (게시글 수 포함)
// ============================
async function renderCategoriesTable() {
    const tbody = document.getElementById('categories-tbody');
    tbody.innerHTML = '';

    const postCounts = await fetchPostCounts();

    adminState.categories.forEach(category => {
        const tr = document.createElement('tr');

        let badgeClass = '';
        let badgeText = '';
        if (category.type === 'PHOTO') {
            badgeClass = 'badge-photo';
            badgeText = 'PHOTO';
        } else if (category.type === 'ARTICLE') {
            badgeClass = 'badge-article';
            badgeText = 'ARTICLE';
        } else if (category.type === 'HTML') {
            badgeClass = 'badge-html';
            badgeText = 'HTML';
        }

        const count = postCounts[category.id] || 0;

        tr.innerHTML = `
            <td>${escapeHtml(category.id)}</td>
            <td>
                ${escapeHtml(category.name)}
                <span class="post-count-badge">${count}개 게시글</span>
            </td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editCategory('${escapeHtml(category.id)}')">수정</button>
                    ${category.isDeletable
                        ? `<button class="btn btn-danger btn-sm" onclick="deleteCategory('${escapeHtml(category.id)}')">삭제</button>`
                        : '<span style="color: #999; margin-left: 0.5rem;">삭제 불가</span>'
                    }
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// HTML 이스케이프
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================
// 카테고리 선택 박스 업데이트
// ============================
function updateCategorySelects() {
    const categoryFilter = document.getElementById('category-filter');
    const postCategory = document.getElementById('post-category');

    categoryFilter.innerHTML = '<option value="">모든 카테고리</option>';
    adminState.categories.forEach(cat => {
        if (cat.id !== 'main') {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        }
    });

    postCategory.innerHTML = '<option value="">선택하세요</option>';
    adminState.categories.forEach(cat => {
        if (cat.id !== 'main') {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            postCategory.appendChild(option);
        }
    });

    categoryFilter.addEventListener('change', (e) => {
        adminState.currentCategory = e.target.value;
        renderPostsGrid();
    });
}

// ============================
// 게시글 그리드 렌더링
// ============================
async function renderPostsGrid() {
    const grid = document.getElementById('posts-grid');
    const categoryId = adminState.currentCategory;

    try {
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
                        ? `<img src="${API_BASE_URL}/files/${encodeURIComponent(post.thumbnail)}" alt="${escapeHtml(post.title)}">`
                        : '<span>이미지 없음</span>'
                    }
                </div>
                <div class="post-card-content">
                    <h3 class="post-card-title">${escapeHtml(post.title)}</h3>
                    <p class="post-card-details">${escapeHtml(post.year)}, ${escapeHtml(post.medium)}, ${escapeHtml(post.size)}</p>
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

// ============================
// 모달
// ============================
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');

    if (modalId === 'category-modal') {
        document.getElementById('category-form').reset();
        document.getElementById('category-edit-id').value = '';
    } else if (modalId === 'post-modal') {
        document.getElementById('post-form').reset();
        document.getElementById('additional-images').innerHTML = '';
        document.getElementById('cv-pdf-filename').value = '';
        document.getElementById('cv-pdf-group').style.display = 'none';
        document.getElementById('normal-post-fields').style.display = '';
        const cvDropZone = document.getElementById('cv-pdf-drop-zone');
        if (cvDropZone) cvDropZone.innerHTML = '<div class="drop-icon">📄</div><p>PDF 파일을 드래그하거나 클릭하여 선택</p>';
        clearThumbnailPreview();

        if (adminState.quillEditor) {
            adminState.quillEditor.setText('');
        }

        adminState.editingPost = null;
        clearUnsaved();
    }
}

// ============================
// 카테고리 CRUD
// ============================
function showAddCategoryModal() {
    document.getElementById('category-modal-title').textContent = '새 카테고리 추가';
    document.getElementById('category-form').reset();
    document.getElementById('category-edit-id').value = '';
    document.getElementById('category-id').disabled = false;
    showModal('category-modal');
}

function editCategory(categoryId) {
    const category = adminState.categories.find(c => c.id === categoryId);
    if (!category) return;

    document.getElementById('category-modal-title').textContent = '카테고리 수정';
    document.getElementById('category-edit-id').value = category.id;
    document.getElementById('category-id').value = category.id;
    document.getElementById('category-id').disabled = true;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-type').value = category.type;

    showModal('category-modal');
}

async function handleSaveCategory(event) {
    event.preventDefault();

    const editId = document.getElementById('category-edit-id').value;
    const isEdit = !!editId;

    const id = document.getElementById('category-id').value.toLowerCase().trim();
    const name = document.getElementById('category-name').value.trim();
    const type = document.getElementById('category-type').value;

    const categoryData = { id, name, type, isDeletable: true };

    try {
        const url = isEdit ? `${API_BASE_URL}/categories/${editId}` : `${API_BASE_URL}/categories`;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });

        if (response.ok) {
            await loadCategories();
            closeModal('category-modal');
            showToast(isEdit ? '카테고리가 수정되었습니다.' : '카테고리가 추가되었습니다.', 'success');
        } else {
            const errorText = await response.text();
            console.error('카테고리 저장 실패:', errorText);
            showToast(`카테고리 저장 실패: ${response.status}`, 'error');
        }
    } catch (error) {
        console.error('카테고리 저장 실패:', error);
        showToast('카테고리 저장 중 오류가 발생했습니다.', 'error');
    }
}

async function deleteCategory(categoryId) {
    const confirmed = await showConfirm('이 카테고리를 삭제하시겠습니까?\n관련된 게시글도 함께 삭제될 수 있습니다.');
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadCategories();
            showToast('카테고리가 삭제되었습니다.', 'success');
        } else {
            showToast('카테고리 삭제에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('카테고리 삭제 실패:', error);
        showToast('카테고리 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// ============================
// Quill 에디터
// ============================
function initializeQuillEditor() {
    adminState.quillEditor = new Quill('#quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image']
            ]
        }
    });

    adminState.quillEditor.on('text-change', markUnsaved);
}

// ============================
// 카테고리 변경 처리 (CV 선택 시 PDF 전용 모드)
// ============================
function handleCategoryChange() {
    const categoryId = document.getElementById('post-category').value;
    const isCv = (categoryId === 'cv');

    document.getElementById('cv-pdf-group').style.display = isCv ? 'block' : 'none';
    document.getElementById('normal-post-fields').style.display = isCv ? 'none' : '';

    if (!isCv) {
        handleContentTypeChange();
    }
}

// ============================
// 콘텐츠 타입 변경 처리
// ============================
function handleContentTypeChange() {
    const contentType = document.getElementById('post-content-type').value;

    document.getElementById('thumbnail-group').style.display = 'none';
    document.getElementById('photo-description-group').style.display = 'none';
    document.getElementById('article-editor-group').style.display = 'none';
    document.getElementById('html-editor-group').style.display = 'none';
    document.getElementById('additional-images-group').style.display = 'none';

    if (contentType === 'PHOTO') {
        document.getElementById('thumbnail-group').style.display = 'block';
        document.getElementById('photo-description-group').style.display = 'block';
        document.getElementById('additional-images-group').style.display = 'block';
    } else if (contentType === 'ARTICLE') {
        document.getElementById('thumbnail-group').style.display = 'block';
        document.getElementById('article-editor-group').style.display = 'block';
        document.getElementById('additional-images-group').style.display = 'block';
    } else if (contentType === 'HTML') {
        document.getElementById('html-editor-group').style.display = 'block';
    }
}

// ============================
// 게시글 추가/수정 모달
// ============================
function showAddPostModal() {
    document.getElementById('post-modal-title').textContent = '새 게시글 추가';
    document.getElementById('post-form').reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-content-type').value = '';
    document.getElementById('additional-images').innerHTML = '';
    document.getElementById('cv-pdf-filename').value = '';
    clearThumbnailPreview();

    if (adminState.quillEditor) {
        adminState.quillEditor.setText('');
    }

    // CV 모드 리셋
    const cvDropZone = document.getElementById('cv-pdf-drop-zone');
    if (cvDropZone) cvDropZone.innerHTML = '<div class="drop-icon">📄</div><p>PDF 파일을 드래그하거나 클릭하여 선택</p>';

    handleCategoryChange();
    handleContentTypeChange();
    clearUnsaved();
    showModal('post-modal');
}

async function editPost(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        const post = await response.json();

        adminState.editingPost = postId;
        document.getElementById('post-modal-title').textContent = '게시글 수정';
        document.getElementById('post-id').value = postId;
        document.getElementById('post-category').value = post.categoryId;

        handleCategoryChange();

        // CV 카테고리인 경우 PDF 파일명만 세팅
        if (post.categoryId === 'cv') {
            document.getElementById('cv-pdf-filename').value = post.thumbnail || '';
            if (post.thumbnail) {
                const cvDropZone = document.getElementById('cv-pdf-drop-zone');
                if (cvDropZone) cvDropZone.innerHTML = `<div class="drop-icon">✅</div><p>${post.thumbnail} (업로드됨)</p>`;
            }
            clearUnsaved();
            showModal('post-modal');
            return;
        }

        document.getElementById('post-content-type').value = post.contentType;
        document.getElementById('post-title').value = post.title;
        document.getElementById('post-year').value = post.year;
        document.getElementById('post-medium').value = post.medium;
        document.getElementById('post-size').value = post.size;
        document.getElementById('post-thumbnail').value = post.thumbnail || '';

        handleContentTypeChange();

        // 썸네일 프리뷰 표시
        if (post.thumbnail) {
            showThumbnailPreview(`${API_BASE_URL}/files/${post.thumbnail}`);
        }

        if (post.contentType === 'PHOTO') {
            document.getElementById('post-description-text').value = post.description || '';
        } else if (post.contentType === 'ARTICLE') {
            if (post.description) {
                try {
                    const delta = JSON.parse(post.description);
                    adminState.quillEditor.setContents(delta);
                } catch (e) {
                    console.error('Quill 데이터 파싱 실패:', e);
                    adminState.quillEditor.setText(post.description || '');
                }
            }
        } else if (post.contentType === 'HTML') {
            document.getElementById('post-html-content').value = post.htmlContent || '';
        }

        // 통합 미디어 리스트 로드
        const additionalImages = document.getElementById('additional-images');
        additionalImages.innerHTML = '';

        if (post.images && post.images.length > 0) {
            const sorted = [...post.images].sort((a, b) =>
                (a.displayOrder || 0) - (b.displayOrder || 0));

            sorted.forEach(img => {
                addMediaInput({
                    imageUrl: img.imageUrl || '',
                    imageDescription: img.imageDescription || '',
                    mediaType: img.mediaType || 'IMAGE',
                    showDescription: img.showDescription !== false,
                    showImageDescription: img.showImageDescription || false,
                    descriptionPosition: img.descriptionPosition || 'right'
                });
            });
        }

        // 하위호환: videoUrl이 있는데 images에 VIDEO 항목이 없으면 추가
        if (post.videoUrl && !(post.images && post.images.some(img => img.mediaType === 'VIDEO'))) {
            addMediaInput({
                imageUrl: post.videoUrl,
                mediaType: 'VIDEO',
                showDescription: false,
                descriptionPosition: 'right'
            });
        }

        clearUnsaved();
        showModal('post-modal');
    } catch (error) {
        console.error('게시글 로드 실패:', error);
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
    }
}

// ============================
// 파일 업로드 (프리뷰 포함)
// ============================
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

// 썸네일 프리뷰 표시
function showThumbnailPreview(src) {
    const group = document.getElementById('thumbnail-group');
    clearThumbnailPreview();

    const previewDiv = document.createElement('div');
    previewDiv.className = 'upload-preview';
    previewDiv.id = 'thumbnail-preview';

    const img = document.createElement('img');
    img.src = src;
    img.alt = '썸네일 미리보기';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'preview-remove';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => {
        document.getElementById('post-thumbnail').value = '';
        clearThumbnailPreview();
    };

    previewDiv.appendChild(img);
    previewDiv.appendChild(removeBtn);
    group.appendChild(previewDiv);
}

function clearThumbnailPreview() {
    const preview = document.getElementById('thumbnail-preview');
    if (preview) preview.remove();
}

// 썸네일 업로드 설정 (드래그 앤 드롭 포함)
function setupThumbnailUpload() {
    const thumbnailInput = document.getElementById('post-thumbnail');
    const group = thumbnailInput.parentElement;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf';
    fileInput.style.display = 'none';
    fileInput.id = 'thumbnail-file';

    // 드래그 앤 드롭 존
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.id = 'thumbnail-drop-zone';
    dropZone.innerHTML = '<div class="drop-icon">📁</div><p>이미지/PDF를 드래그하거나 클릭하여 선택</p>';
    dropZone.onclick = () => fileInput.click();

    // 드래그 이벤트
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            await handleThumbnailFile(file, dropZone);
        } else {
            showToast('이미지 또는 PDF 파일만 업로드 가능합니다.', 'warning');
        }
    });

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await handleThumbnailFile(file, dropZone);
        }
    };

    group.appendChild(fileInput);
    group.appendChild(dropZone);
}

async function handleThumbnailFile(file, dropZone) {
    // 로컬 프리뷰 즉시 표시
    const localUrl = URL.createObjectURL(file);
    showThumbnailPreview(localUrl);

    const originalText = dropZone.innerHTML;
    dropZone.innerHTML = '<p>업로드 중...</p>';

    try {
        const fileName = await uploadImage(file);
        document.getElementById('post-thumbnail').value = fileName;
        // 서버 URL로 프리뷰 교체
        showThumbnailPreview(`${API_BASE_URL}/files/${fileName}`);
        showToast('썸네일이 업로드되었습니다.', 'success');
        markUnsaved();
    } catch (error) {
        clearThumbnailPreview();
        showToast('파일 업로드에 실패했습니다.', 'error');
    } finally {
        dropZone.innerHTML = originalText;
        URL.revokeObjectURL(localUrl);
    }
}

// ============================
// CV PDF 업로드 설정
// ============================
function setupCvPdfUpload() {
    const cvGroup = document.getElementById('cv-pdf-group');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.style.display = 'none';
    fileInput.id = 'cv-pdf-file';

    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.id = 'cv-pdf-drop-zone';
    dropZone.innerHTML = '<div class="drop-icon">📄</div><p>PDF 파일을 드래그하거나 클릭하여 선택</p>';
    dropZone.onclick = () => fileInput.click();

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            await handleCvPdfFile(file, dropZone);
        } else {
            showToast('PDF 파일만 업로드 가능합니다.', 'warning');
        }
    });

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await handleCvPdfFile(file, dropZone);
        }
    };

    cvGroup.appendChild(fileInput);
    cvGroup.appendChild(dropZone);
}

async function handleCvPdfFile(file, dropZone) {
    const originalText = dropZone.innerHTML;
    dropZone.innerHTML = '<p>업로드 중...</p>';

    try {
        const fileName = await uploadImage(file);
        document.getElementById('cv-pdf-filename').value = fileName;
        dropZone.innerHTML = `<div class="drop-icon">✅</div><p>${file.name} 업로드 완료</p>`;
        showToast('PDF가 업로드되었습니다.', 'success');
        markUnsaved();
    } catch (error) {
        dropZone.innerHTML = originalText;
        showToast('PDF 업로드에 실패했습니다.', 'error');
    }
}

// ============================
// 통합 미디어 입력 (이미지/영상, 순서변경, 설명옵션)
// ============================
function addMediaInput(options = {}) {
    const {
        imageUrl = '',
        imageDescription = '',
        mediaType = 'IMAGE',
        showDescription = true,
        descriptionPosition = 'right'
    } = options;

    const container = document.getElementById('additional-images');
    const wrapper = document.createElement('div');
    wrapper.className = 'image-entry';
    wrapper.dataset.mediaType = mediaType;
    wrapper.style.cssText = 'border: 1px solid #e0e0e0; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;';

    // 상단: 순서버튼 + 타입 + 파일명 + 버튼들
    const topRow = document.createElement('div');
    topRow.className = 'image-input-group';
    topRow.style.cssText = 'display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;';

    // 순서 변경 버튼
    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'btn btn-secondary btn-sm btn-reorder';
    upBtn.textContent = '\u25B2';
    upBtn.title = '위로';
    upBtn.onclick = () => moveMediaEntry(wrapper, -1);

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'btn btn-secondary btn-sm btn-reorder';
    downBtn.textContent = '\u25BC';
    downBtn.title = '아래로';
    downBtn.onclick = () => moveMediaEntry(wrapper, 1);

    // 타입 뱃지
    const typeBadge = document.createElement('span');
    typeBadge.className = `badge ${mediaType === 'VIDEO' ? 'badge-html' : 'badge-photo'}`;
    typeBadge.textContent = mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE';
    typeBadge.style.marginRight = '0.3rem';

    // URL/파일명 입력
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'additional-image-url';
    input.value = imageUrl;
    input.style.flex = '1';

    if (mediaType === 'VIDEO') {
        input.placeholder = 'YouTube URL (예: https://www.youtube.com/watch?v=...)';
        input.readOnly = false;
        input.addEventListener('input', markUnsaved);
    } else {
        input.placeholder = '파일명';
        input.readOnly = true;
    }

    // 파일 선택 (IMAGE만)
    let fileInput, selectBtn;
    if (mediaType === 'IMAGE') {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'btn btn-secondary btn-sm';
        selectBtn.textContent = '파일 선택';
        selectBtn.onclick = () => fileInput.click();

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const localUrl = URL.createObjectURL(file);
                showInlinePreview(wrapper, localUrl);
                try {
                    selectBtn.textContent = '업로드 중...';
                    selectBtn.disabled = true;
                    const fileName = await uploadImage(file);
                    input.value = fileName;
                    showInlinePreview(wrapper, `${API_BASE_URL}/files/${fileName}`);
                    showToast('이미지가 업로드되었습니다.', 'success');
                    markUnsaved();
                } catch (error) {
                    removeInlinePreview(wrapper);
                    showToast('파일 업로드에 실패했습니다.', 'error');
                } finally {
                    selectBtn.textContent = '파일 선택';
                    selectBtn.disabled = false;
                    URL.revokeObjectURL(localUrl);
                }
            }
        };
    }

    // 삭제 버튼
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-image';
    removeBtn.textContent = '삭제';
    removeBtn.onclick = () => { wrapper.remove(); markUnsaved(); };

    topRow.appendChild(upBtn);
    topRow.appendChild(downBtn);
    topRow.appendChild(typeBadge);
    topRow.appendChild(input);
    if (mediaType === 'IMAGE') {
        topRow.appendChild(fileInput);
        topRow.appendChild(selectBtn);
    }
    topRow.appendChild(removeBtn);

    // 옵션 행: 메인 설명 + 이미지 설명 + 위치
    const optionsRow = document.createElement('div');
    optionsRow.className = 'media-options';
    optionsRow.style.cssText = 'margin-top: 0.5rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; font-size: 0.85rem;';

    // 메인 설명 표시 체크박스
    const showDescLabel = document.createElement('label');
    showDescLabel.style.cssText = 'display: flex; align-items: center; gap: 0.3rem; cursor: pointer; font-weight: normal; margin: 0;';
    const showDescCheck = document.createElement('input');
    showDescCheck.type = 'checkbox';
    showDescCheck.className = 'show-description-check';
    showDescCheck.checked = showDescription;
    showDescLabel.appendChild(showDescCheck);
    showDescLabel.appendChild(document.createTextNode('메인 설명'));

    // 이미지 설명 표시 체크박스
    const showImgDescLabel = document.createElement('label');
    showImgDescLabel.style.cssText = 'display: flex; align-items: center; gap: 0.3rem; cursor: pointer; font-weight: normal; margin: 0;';
    const showImgDescCheck = document.createElement('input');
    showImgDescCheck.type = 'checkbox';
    showImgDescCheck.className = 'show-image-description-check';
    showImgDescCheck.checked = options.showImageDescription || false;
    showImgDescLabel.appendChild(showImgDescCheck);
    showImgDescLabel.appendChild(document.createTextNode('이미지 설명'));

    // 이미지 설명 위치 선택
    const posSelect = document.createElement('select');
    posSelect.className = 'description-position-select';
    posSelect.style.cssText = 'font-size: 0.85rem; padding: 0.2rem 0.4rem;';
    posSelect.innerHTML = `
        <option value="right" ${descriptionPosition === 'right' ? 'selected' : ''}>이미지 설명: 우측</option>
        <option value="bottom" ${descriptionPosition === 'bottom' ? 'selected' : ''}>이미지 설명: 하단</option>
    `;
    // 초기 상태 설정
    function updatePosSelectState() {
        const imgDescChecked = showImgDescCheck.checked;
        const mainDescChecked = showDescCheck.checked;
        posSelect.disabled = !imgDescChecked;
        // 메인 설명 체크 시 우측 옵션 비활성화 → 하단으로 강제
        const rightOption = posSelect.querySelector('option[value="right"]');
        if (mainDescChecked) {
            rightOption.disabled = true;
            if (posSelect.value === 'right') posSelect.value = 'bottom';
        } else {
            rightOption.disabled = false;
        }
    }
    updatePosSelectState();

    showDescCheck.onchange = () => {
        updatePosSelectState();
        markUnsaved();
    };
    showImgDescCheck.onchange = () => {
        updatePosSelectState();
        markUnsaved();
    };
    posSelect.onchange = () => markUnsaved();

    optionsRow.appendChild(showDescLabel);
    optionsRow.appendChild(showImgDescLabel);
    optionsRow.appendChild(posSelect);

    // 이미지 설명 입력
    const descInput = document.createElement('textarea');
    descInput.className = 'additional-image-desc';
    descInput.value = imageDescription;
    descInput.placeholder = '이미지 설명 (선택사항)';
    descInput.rows = 2;
    descInput.style.cssText = 'width: 100%; margin-top: 0.5rem; padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 4px; font-family: inherit; font-size: 0.9rem; resize: vertical;';

    wrapper.appendChild(topRow);
    wrapper.appendChild(optionsRow);
    wrapper.appendChild(descInput);

    // 프리뷰
    if (mediaType === 'IMAGE' && imageUrl) {
        showInlinePreview(wrapper, `${API_BASE_URL}/files/${imageUrl}`);
    } else if (mediaType === 'VIDEO' && imageUrl) {
        const videoId = extractYouTubeId(imageUrl);
        if (videoId) {
            showInlinePreview(wrapper, `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
        }
    }

    container.appendChild(wrapper);
}

// 하위호환용
function addImageInput(imageUrl, imageDescription) {
    addMediaInput({ imageUrl: imageUrl || '', imageDescription: imageDescription || '' });
}

// 미디어 항목 순서 이동
function moveMediaEntry(wrapper, direction) {
    const container = document.getElementById('additional-images');
    const entries = Array.from(container.children);
    const index = entries.indexOf(wrapper);
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= entries.length) return;

    if (direction === -1) {
        container.insertBefore(wrapper, entries[targetIndex]);
    } else {
        container.insertBefore(wrapper, entries[targetIndex].nextSibling);
    }
    markUnsaved();
}

// YouTube URL에서 Video ID 추출
function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

function showInlinePreview(container, src) {
    removeInlinePreview(container);
    const preview = document.createElement('div');
    preview.className = 'upload-preview';
    preview.style.width = '100%';
    preview.style.marginTop = '0.5rem';
    const img = document.createElement('img');
    img.src = src;
    img.alt = '이미지 미리보기';
    preview.appendChild(img);
    container.appendChild(preview);
}

function removeInlinePreview(container) {
    const existing = container.querySelector('.upload-preview');
    if (existing) existing.remove();
}

// ============================
// 게시글 저장
// ============================
async function handleSavePost(event) {
    event.preventDefault();

    const postId = document.getElementById('post-id').value;
    const contentType = document.getElementById('post-content-type').value;

    const categoryId = document.getElementById('post-category').value;

    // CV 카테고리: PDF 전용 처리
    if (categoryId === 'cv') {
        const pdfFileName = document.getElementById('cv-pdf-filename').value;
        if (!pdfFileName) {
            showToast('PDF 파일을 업로드해주세요.', 'warning');
            return;
        }

        const postData = {
            categoryId: 'cv',
            contentType: 'PHOTO',
            title: 'CV',
            year: '-',
            medium: '-',
            size: '-',
            thumbnail: pdfFileName
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
                clearUnsaved();
                closeModal('post-modal');
                await renderPostsGrid();
                showToast('CV가 저장되었습니다.', 'success');
            } else {
                showToast('CV 저장에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('CV 저장 실패:', error);
            showToast('CV 저장 중 오류가 발생했습니다.', 'error');
        }
        return;
    }

    const postData = {
        categoryId: categoryId,
        contentType: contentType,
        title: document.getElementById('post-title').value,
        year: document.getElementById('post-year').value,
        medium: document.getElementById('post-medium').value,
        size: document.getElementById('post-size').value
    };

    // 통합 미디어 리스트 수집
    const mediaEntries = Array.from(document.querySelectorAll('.image-entry'))
        .map((entry, index) => ({
            imageUrl: entry.querySelector('.additional-image-url').value,
            imageDescription: entry.querySelector('.additional-image-desc')?.value || '',
            displayOrder: index,
            mediaType: entry.dataset.mediaType || 'IMAGE',
            showDescription: entry.querySelector('.show-description-check')?.checked ?? true,
            showImageDescription: entry.querySelector('.show-image-description-check')?.checked ?? false,
            descriptionPosition: entry.querySelector('.description-position-select')?.value || 'right'
        }))
        .filter(img => img.imageUrl.trim() !== '');

    if (contentType === 'PHOTO') {
        postData.thumbnail = document.getElementById('post-thumbnail').value;
        postData.description = document.getElementById('post-description-text').value;

        // 썸네일이 미디어 리스트에 없으면 맨 앞에 추가
        const thumbVal = postData.thumbnail;
        if (thumbVal && !mediaEntries.some(e => e.imageUrl === thumbVal && e.mediaType === 'IMAGE')) {
            mediaEntries.unshift({
                imageUrl: thumbVal,
                imageDescription: '',
                displayOrder: 0,
                mediaType: 'IMAGE',
                showDescription: true,
                descriptionPosition: 'right'
            });
        }

        // displayOrder 재정렬
        mediaEntries.forEach((e, i) => { e.displayOrder = i; });
        postData.images = mediaEntries;

        // thumbnail은 첫 번째 IMAGE 항목으로 설정
        const firstImage = mediaEntries.find(e => e.mediaType === 'IMAGE');
        if (firstImage) postData.thumbnail = firstImage.imageUrl;
    } else if (contentType === 'ARTICLE') {
        postData.thumbnail = document.getElementById('post-thumbnail').value;
        const delta = adminState.quillEditor.getContents();
        postData.description = JSON.stringify(delta);

        mediaEntries.forEach((e, i) => { e.displayOrder = i; });
        postData.images = mediaEntries;
    } else if (contentType === 'HTML') {
        postData.htmlContent = document.getElementById('post-html-content').value;
    }

    try {
        const url = postId ? `${API_BASE_URL}/posts/${postId}` : `${API_BASE_URL}/posts`;
        const method = postId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });

        if (response.ok) {
            clearUnsaved();
            closeModal('post-modal');
            await renderPostsGrid();
            showToast('게시글이 저장되었습니다.', 'success');
        } else {
            const errorText = await response.text();
            console.error('게시글 저장 실패:', errorText);
            showToast('게시글 저장에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('게시글 저장 실패:', error);
        showToast('게시글 저장 중 오류가 발생했습니다.', 'error');
    }
}

// ============================
// 게시글 삭제
// ============================
async function deletePost(postId) {
    const confirmed = await showConfirm('이 게시글을 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await renderPostsGrid();
            showToast('게시글이 삭제되었습니다.', 'success');
        } else {
            showToast('게시글 삭제에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('게시글 삭제 실패:', error);
        showToast('게시글 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// ============================
// 모달 외부 클릭시 닫기
// ============================
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
};
