<template>
  <div class="saints-page">
    <div class="header-row">
      <h2>Calendrier des saints chrétiens</h2>
      <div class="filters">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un saint ou un mois..."
        />
        <select v-model="selectedMonth">
          <option value="">Tous les mois</option>
          <option v-for="m in months" :key="m.value" :value="m.value">
            {{ m.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Formulaire d'ajout -->
    <form @submit.prevent="addSaint" class="add-form">
      <h3>Ajouter un saint</h3>
      <div class="form-grid">
        <label>
          Mois :
          <select v-model="newForm.month" required>
            <option v-for="m in months" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
        </label>
        <label>
          Jour :
          <input
            v-model="newForm.day"
            type="number"
            min="1"
            max="31"
            placeholder="Ex: 14"
            required
          />
        </label>
        <label class="grow">
          Saint(s) fêté(s) :
          <input
            v-model="newForm.saint"
            type="text"
            placeholder="Nom du saint"
            required
          />
        </label>
        <label class="grow">
          Notice / Repère :
          <input
            v-model="newForm.note"
            type="text"
            placeholder="Optionnel"
          />
        </label>
        <button type="submit" class="btn-add">Ajouter</button>
      </div>
    </form>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div class="table-wrapper">
      <table class="saints-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Saint(s) fêté(s)</th>
            <th>Notice / Repère</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredSaints"
            :key="item.id"
            :class="{ 'is-today': isToday(item.month, item.day) }"
          >
            <!-- Mode édition -->
            <template v-if="editingId === item.id">
              <td class="inline-date">
                <input
                  v-model="editForm.day"
                  type="number"
                  min="1"
                  max="31"
                  class="day-input"
                  required
                />
                <select v-model="editForm.month" required>
                  <option v-for="m in months" :key="m.value" :value="m.value">
                    {{ m.label }}
                  </option>
                </select>
              </td>
              <td>
                <input v-model="editForm.saint" type="text" class="full-input" required />
              </td>
              <td>
                <input v-model="editForm.note" type="text" class="full-input" />
              </td>
              <td class="actions-cell">
                <button type="button" @click="saveEdit(item.id)" class="btn-save">Enregistrer</button>
                <button type="button" @click="cancelEdit" class="btn-cancel">Annuler</button>
              </td>
            </template>

            <!-- Mode lecture -->
            <template v-else>
              <td class="date-cell">
                <strong>{{ formatDate(item.month, item.day) }}</strong>
                <span v-if="isToday(item.month, item.day)" class="badge-today">Aujourd'hui</span>
              </td>
              <td>{{ item.saint }}</td>
              <td class="note-cell">{{ item.note }}</td>
              <td class="actions-cell">
                <button type="button" @click="startEdit(item)" class="btn-edit">Modifier</button>
                <button type="button" @click="deleteSaint(item.id)" class="btn-del">Supprimer</button>
              </td>
            </template>
          </tr>

          <tr v-if="!loading && filteredSaints.length === 0">
            <td colspan="4" class="empty-row">Aucun saint trouvé pour ce filtre.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const token = localStorage.getItem('token');
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
};

const saintsList = ref([]);
const loading = ref(true);
const errorMsg = ref('');
const searchQuery = ref('');
const selectedMonth = ref('');

const months = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' }
];

const newForm = ref({
  month: '01',
  day: '',
  saint: '',
  note: ''
});

const editingId = ref(null);
const editForm = ref({
  month: '01',
  day: '',
  saint: '',
  note: ''
});

const normalizeDay = (d) => String(parseInt(d, 10) || '').padStart(2, '0');

const loadSaints = async () => {
  loading.value = true;
  errorMsg.value = '';
  const res = await fetch('/api/saints', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    saintsList.value = await res.json();
  } else {
    errorMsg.value = 'Impossible de charger la liste des saints.';
  }
  loading.value = false;
};

const addSaint = async () => {
  errorMsg.value = '';
  const day = normalizeDay(newForm.value.day);
  const res = await fetch('/api/saints', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      month: newForm.value.month,
      day,
      saint: newForm.value.saint,
      note: newForm.value.note
    })
  });
  if (res.ok) {
    newForm.value = { ...newForm.value, day: '', saint: '', note: '' };
    await loadSaints();
  } else {
    const err = await res.json().catch(() => ({}));
    errorMsg.value = err.error || 'Erreur lors de l’ajout.';
  }
};

const startEdit = (item) => {
  editingId.value = item.id;
  editForm.value = {
    month: item.month,
    day: String(parseInt(item.day, 10)),
    saint: item.saint,
    note: item.note || ''
  };
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveEdit = async (id) => {
  errorMsg.value = '';
  const day = normalizeDay(editForm.value.day);
  const res = await fetch(`/api/saints/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      month: editForm.value.month,
      day,
      saint: editForm.value.saint,
      note: editForm.value.note
    })
  });
  if (res.ok) {
    editingId.value = null;
    await loadSaints();
  } else {
    const err = await res.json().catch(() => ({}));
    errorMsg.value = err.error || 'Erreur lors de la modification.';
  }
};

const deleteSaint = async (id) => {
  errorMsg.value = '';
  const res = await fetch(`/api/saints/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    if (editingId.value === id) editingId.value = null;
    await loadSaints();
  } else {
    errorMsg.value = 'Erreur lors de la suppression.';
  }
};

const formatDate = (month, day) => {
  const m = months.find(item => item.value === month);
  const d = parseInt(day, 10);
  return `${d === 1 ? '1er' : d} ${m ? m.label.toLowerCase() : month}`;
};

const isToday = (month, day) => {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  return month === currentMonth && day === currentDay;
};

const filteredSaints = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return saintsList.value.filter(item => {
    const matchesMonth = !selectedMonth.value || item.month === selectedMonth.value;
    const monthLabel = months.find(m => m.value === item.month)?.label.toLowerCase() || '';
    const matchesQuery =
      !q ||
      item.saint.toLowerCase().includes(q) ||
      (item.note || '').toLowerCase().includes(q) ||
      monthLabel.includes(q) ||
      `${item.day}/${item.month}`.includes(q);
    return matchesMonth && matchesQuery;
  });
});

onMounted(loadSaints);
</script>

<style scoped>
.header-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.add-form {
  background: #1e1e1e;
  padding: 1.2rem;
  border-radius: 8px;
  border: 1px solid #2e2e2e;
  margin-bottom: 1.5rem;
}
.add-form h3 {
  margin-bottom: 0.9rem;
  font-size: 1rem;
  color: #42b883;
}
.form-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  align-items: flex-end;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
}
.form-grid .grow {
  flex: 1 1 200px;
}
input, select {
  padding: 0.55rem 0.7rem;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: white;
  border-radius: 4px;
}
.day-input {
  width: 68px;
}
.full-input {
  width: 100%;
}
button {
  padding: 0.55rem 0.85rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
}
.btn-add {
  background: #42b883;
  color: #121212;
  padding: 0.6rem 1.1rem;
}
.btn-edit {
  background: #42a5f5;
  color: #121212;
}
.btn-del {
  background: #e53935;
  color: white;
}
.btn-save {
  background: #42b883;
  color: #121212;
}
.btn-cancel {
  background: #424242;
  color: white;
}
.error-msg {
  color: #ef5350;
  margin-bottom: 1rem;
}
.table-wrapper {
  background: #1e1e1e;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid #2e2e2e;
}
.saints-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.saints-table th,
.saints-table td {
  padding: 0.8rem 0.9rem;
  border-bottom: 1px solid #2c2c2c;
}
.saints-table th {
  background: #252525;
  color: #42b883;
  font-weight: 600;
}
.saints-table tr:hover {
  background: #262626;
}
.saints-table tr.is-today {
  background: rgba(66, 184, 131, 0.14);
}
.date-cell, .inline-date {
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.badge-today {
  background: #42b883;
  color: #121212;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}
.note-cell {
  color: #b0b0b0;
  font-size: 0.9rem;
}
.actions-col {
  width: 180px;
}
.actions-cell {
  white-space: nowrap;
  display: flex;
  gap: 0.45rem;
}
.empty-row {
  text-align: center;
  color: #888;
  padding: 2rem !important;
}
</style>
