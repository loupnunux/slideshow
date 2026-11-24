<template>
  <div class="upload-page">
    <h2>Ajouter une image au carrousel</h2>
    <form @submit.prevent="uploadImage" class="upload-form">
      <input type="file" @change="onFileChange" accept="image/*" required />
      <input v-model="title" type="text" placeholder="Titre (optionnel)" />
      <div class="dates">
        <label>Du : <input v-model="startDate" type="date" required /></label>
        <label>Au : <input v-model="endDate" type="date" required /></label>
      </div>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Envoi...' : 'Ajouter l’image' }}
      </button>
    </form>

    <div class="list-header">
      <h3>Images enregistrées ({{ images.length }})</h3>
      <div class="view-toggle">
        <button
          type="button"
          :class="['btn-toggle', { active: viewMode === 'grid' }]"
          @click="viewMode = 'grid'"
        >
          ⊞ Mosaïque
        </button>
        <button
          type="button"
          :class="['btn-toggle', { active: viewMode === 'table' }]"
          @click="viewMode = 'table'"
        >
          ☰ Tableau
        </button>
      </div>
    </div>

    <p v-if="images.length === 0" class="empty-state">Aucune image enregistrée.</p>

    <!-- Vue Mosaïque -->
    <div v-else-if="viewMode === 'grid'" class="image-grid">
      <div v-for="img in images" :key="img.id" class="image-card">
        <img :src="`/uploads/${img.filename}?token=${token}`" :alt="img.title" />

        <!-- Mode édition -->
        <form v-if="editingId === img.id" @submit.prevent="saveEdit(img.id)" class="edit-form">
          <label>
            Titre :
            <input v-model="editForm.title" type="text" required />
          </label>
          <label>
            Du :
            <input v-model="editForm.startDate" type="date" required />
          </label>
          <label>
            Au :
            <input v-model="editForm.endDate" type="date" required />
          </label>
          <div class="edit-actions">
            <button type="submit" class="btn-save">Enregistrer</button>
            <button type="button" @click="cancelEdit" class="btn-cancel">Annuler</button>
          </div>
        </form>

        <!-- Mode lecture -->
        <div v-else class="info">
          <strong>{{ img.title }}</strong>
          <span>Du {{ img.startDate }} au {{ img.endDate }}</span>
          <div class="card-actions">
            <button type="button" @click="startEdit(img)" class="btn-edit">Modifier dates</button>
            <button type="button" @click="deleteImage(img.id)" class="btn-del">Supprimer</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vue Tableau -->
    <div v-else class="table-wrapper">
      <table class="images-table">
        <thead>
          <tr>
            <th>Aperçu</th>
            <th>Titre</th>
            <th>Date de début</th>
            <th>Date de fin</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="img in images" :key="img.id">
            <td>
              <img
                :src="`/uploads/${img.filename}?token=${token}`"
                :alt="img.title"
                class="table-thumb"
              />
            </td>

            <!-- Mode édition -->
            <template v-if="editingId === img.id">
              <td>
                <input v-model="editForm.title" type="text" class="full-input" required />
              </td>
              <td>
                <input v-model="editForm.startDate" type="date" required />
              </td>
              <td>
                <input v-model="editForm.endDate" type="date" required />
              </td>
              <td class="actions-cell">
                <button type="button" @click="saveEdit(img.id)" class="btn-save">Enregistrer</button>
                <button type="button" @click="cancelEdit" class="btn-cancel">Annuler</button>
              </td>
            </template>

            <!-- Mode lecture -->
            <template v-else>
              <td class="title-cell">
                <strong class="title-truncate" :title="img.title">{{ img.title }}</strong>
              </td>
              <td>{{ img.startDate }}</td>
              <td>{{ img.endDate }}</td>
              <td class="actions-cell">
                <button type="button" @click="startEdit(img)" class="btn-edit">Modifier dates</button>
                <button type="button" @click="deleteImage(img.id)" class="btn-del">Supprimer</button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const token = localStorage.getItem('token');
const images = ref([]);
const file = ref(null);
const title = ref('');
const startDate = ref(new Date().toISOString().split('T')[0]);
const endDate = ref('');
const loading = ref(false);
const viewMode = ref('grid');

const editingId = ref(null);
const editForm = ref({
  title: '',
  startDate: '',
  endDate: ''
});

const onFileChange = (e) => { file.value = e.target.files[0]; };

const loadImages = async () => {
  const res = await fetch('/api/images', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) images.value = await res.json();
};

const uploadImage = async () => {
  if (!file.value) return;
  loading.value = true;
  const formData = new FormData();
  formData.append('image', file.value);
  formData.append('title', title.value);
  formData.append('startDate', startDate.value);
  formData.append('endDate', endDate.value);

  const res = await fetch('/api/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  loading.value = false;
  if (res.ok) {
    title.value = '';
    file.value = null;
    await loadImages();
  }
};

const startEdit = (img) => {
  editingId.value = img.id;
  editForm.value = {
    title: img.title,
    startDate: img.startDate,
    endDate: img.endDate
  };
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveEdit = async (id) => {
  const res = await fetch(`/api/images/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(editForm.value)
  });
  if (res.ok) {
    editingId.value = null;
    await loadImages();
  }
};

const deleteImage = async (id) => {
  await fetch(`/api/images/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (editingId.value === id) editingId.value = null;
  await loadImages();
};

onMounted(loadImages);
</script>

<style scoped>
.upload-form {
  background: #1e1e1e; padding: 1.5rem; border-radius: 8px;
  display: flex; flex-direction: column; gap: 1rem; max-width: 500px; margin: 1rem 0 2rem;
}
.dates { display: flex; gap: 1rem; }
input { padding: 0.6rem; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 4px; }
button { padding: 0.75rem; background: #42b883; color: #121212; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; }

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}
.view-toggle {
  display: inline-flex;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
}
.btn-toggle {
  background: transparent;
  color: #aaa;
  padding: 0.5rem 0.9rem;
  border-radius: 0;
  font-size: 0.9rem;
}
.btn-toggle.active {
  background: #42b883;
  color: #121212;
}
.empty-state {
  color: #888;
  margin-top: 1rem;
}

/* Mosaïque */
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; }
.image-card { background: #1e1e1e; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.image-card img { width: 100%; height: 150px; object-fit: cover; }
.info, .edit-form { padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.9rem; }
.edit-form label { display: flex; flex-direction: column; gap: 0.25rem; }
.card-actions, .edit-actions { display: flex; gap: 0.5rem; margin-top: 0.4rem; }

/* Tableau */
.table-wrapper {
  background: #1e1e1e;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid #2e2e2e;
}
.images-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  text-align: left;
}
.images-table th,
.images-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #2c2c2c;
  vertical-align: middle;
}
.images-table th {
  background: #252525;
  color: #42b883;
  font-weight: 600;
}
.images-table tr:hover {
  background: #262626;
}
.images-table th:nth-child(1),
.images-table td:nth-child(1) {
  width: 96px;
}
.images-table th:nth-child(3),
.images-table td:nth-child(3),
.images-table th:nth-child(4),
.images-table td:nth-child(4) {
  width: 135px;
  white-space: nowrap;
}
.title-cell {
  overflow: hidden;
}
.title-truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.table-thumb {
  width: 72px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}
.full-input {
  width: 100%;
}
.actions-col {
  width: 210px;
}
.actions-cell {
  white-space: nowrap;
  display: flex;
  gap: 0.5rem;
}

.btn-edit { background: #42a5f5; color: #121212; padding: 0.45rem 0.7rem; flex: 1; }
.btn-del { background: #e53935; color: white; padding: 0.45rem 0.7rem; flex: 1; }
.btn-save { background: #42b883; color: #121212; padding: 0.45rem 0.7rem; flex: 1; }
.btn-cancel { background: #424242; color: white; padding: 0.45rem 0.7rem; flex: 1; }
</style>
