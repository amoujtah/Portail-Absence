import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import StudentPicker, { getStudentLabel, getStudentName } from '../../components/StudentPicker';

const API_URL = 'http://127.0.0.1:8000/api';

const emptyForm = {
  etudiant: '',
  module: '',
  valeur: '',
};

function GestionNotes() {
  const [notes, setNotes] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [modules, setModules] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('access');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/notes/`, { headers }),
      axios.get(`${API_URL}/etudiants/`, { headers }),
      axios.get(`${API_URL}/modules/`, { headers }),
      axios.get(`${API_URL}/groupes/`, { headers }),
    ]).then(([notesRes, etudiantsRes, modulesRes, groupesRes]) => {
      setNotes(notesRes.data);
      setEtudiants(etudiantsRes.data);
      setModules(modulesRes.data);
      setGroupes(groupesRes.data);
      setLoading(false);
    }).catch(() => {
      setMessage("Impossible de charger les notes.");
      setMessageType('error');
      setLoading(false);
    });
  }, [headers]);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadData();
  }, [loadData, navigate, token]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const selectedStudent = useMemo(
    () => etudiants.find((etudiant) => String(etudiant.id) === String(form.etudiant)) || null,
    [etudiants, form.etudiant]
  );

  const handleStudentSelect = (etudiant) => {
    setForm((current) => ({ ...current, etudiant: String(etudiant.id) }));
    setMessage('');
  };

  const startEdit = (note) => {
    setEditingId(String(note.id));
    setForm({
      etudiant: String(note.etudiant || ''),
      module: String(note.module || ''),
      valeur: String(note.valeur || ''),
    });
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.etudiant) {
      setMessage("Choisissez un etudiant avant d'enregistrer une note.");
      setMessageType('error');
      return;
    }

    const payload = {
      etudiant: form.etudiant,
      module: form.module,
      valeur: Number(form.valeur),
    };

    try {
      if (editingId) {
        await axios.patch(`${API_URL}/notes/${editingId}/`, payload, { headers });
        setMessage('Note modifiee avec succes.');
      } else {
        await axios.post(`${API_URL}/notes/`, payload, { headers });
        setMessage('Note ajoutee avec succes.');
      }
      setMessageType('success');
      resetForm();
      loadData();
    } catch (err) {
      setMessage("Erreur lors de l'enregistrement de la note.");
      setMessageType('error');
    }
  };

  const deleteNote = async (note) => {
    const confirmed = window.confirm('Supprimer cette note ?');
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/notes/${note.id}/`, { headers });
      setNotes((current) => current.filter((item) => String(item.id) !== String(note.id)));
      if (String(editingId) === String(note.id)) resetForm();
      setMessage('Note supprimee avec succes.');
      setMessageType('success');
    } catch (err) {
      setMessage("Erreur lors de la suppression de la note.");
      setMessageType('error');
    }
  };

  const notesValides = notes.filter((note) => Number(note.valeur) >= 10).length;
  const notesFaibles = notes.filter((note) => Number(note.valeur) < 10).length;
  const moyenneGenerale = notes.length
    ? notes.reduce((total, note) => total + Number(note.valeur || 0), 0) / notes.length
    : 0;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">
          <div className="brand-mark">PA</div>
          <div className="brand-text">
            <span className="brand-title">Portail Absences</span>
            <span className="brand-subtitle">Gestion notes</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className="btn btn-soft" type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn btn-accent" type="button" onClick={() => { localStorage.clear(); navigate('/'); }}>Deconnexion</button>
        </div>
      </nav>

      <main className="page page-wide">
        <header className="page-header">
          <div>
            <p className="kicker">Evaluations</p>
            <h1 className="page-title">Gestion des notes</h1>
            <p className="page-description">Ajoutez, modifiez et supprimez les resultats des etudiants.</p>
          </div>
        </header>

        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'}`}>{message}</div>
        )}

        <section className="stats-grid" aria-label="Resume des notes">
          <article className="stat-card accent">
            <div className="icon-tile">MO</div>
            <div>
              <div className="stat-value">{moyenneGenerale.toFixed(1)}</div>
              <p className="stat-label">Moyenne generale</p>
            </div>
          </article>
          <article className="stat-card success">
            <div className="icon-tile">OK</div>
            <div>
              <div className="stat-value">{notesValides}</div>
              <p className="stat-label">Notes >= 10</p>
            </div>
          </article>
          <article className="stat-card warning">
            <div className="icon-tile">RF</div>
            <div>
              <div className="stat-value">{notesFaibles}</div>
              <p className="stat-label">Notes &lt; 10</p>
            </div>
          </article>
        </section>

        <StudentPicker
          students={etudiants}
          groupes={groupes}
          selectedStudentId={form.etudiant}
          onSelect={handleStudentSelect}
          title="Choisir l'etudiant"
        />

        <section className="panel admin-crud-panel">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Modifier une note' : 'Ajouter une note'}</h2>
            {editingId && <button className="btn btn-soft" type="button" onClick={resetForm}>Annuler</button>}
          </div>
          <form className="form-grid admin-form-grid" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="note-etudiant">Etudiant selectionne</label>
              <input
                id="note-etudiant"
                className="form-control"
                value={selectedStudent ? getStudentLabel(selectedStudent) : ''}
                placeholder="Choisir un etudiant depuis la recherche"
                readOnly
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="note-module">Module</label>
              <select id="note-module" name="module" className="form-control" value={form.module} onChange={handleChange} required>
                <option value="">Choisir un module</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>{module.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="note-valeur">Note /20</label>
              <input
                id="note-valeur"
                name="valeur"
                className="form-control"
                type="number"
                min="0"
                max="20"
                step="0.25"
                value={form.valeur}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">{editingId ? 'Enregistrer' : 'Ajouter la note'}</button>
            </div>
          </form>
        </section>

        <section className="panel admin-crud-panel panel-spaced">
          <div className="panel-header">
            <h2 className="panel-title">Releve des notes</h2>
            <span className="badge badge-primary">{notes.length} note(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Etudiant</th>
                  <th>Module</th>
                  <th>Note</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty-state">Chargement...</td></tr>
                ) : notes.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state">Aucune note enregistree</td></tr>
                ) : notes.map((note) => (
                  <tr key={note.id}>
                    <td>
                      <span className="admin-list-title">
                        <strong>{note.etudiant_nom || getStudentName(etudiants.find((etudiant) => String(etudiant.id) === String(note.etudiant))) || `Etudiant ${note.etudiant}`}</strong>
                        <span className="cell-muted">{note.etudiant_matricule || '-'}</span>
                      </span>
                    </td>
                    <td>{note.module_nom || `Module ${note.module}`}</td>
                    <td className={Number(note.valeur) < 10 ? 'score-danger' : 'score-good'}>{note.valeur}/20</td>
                    <td>{note.date || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-soft" type="button" onClick={() => startEdit(note)}>Modifier</button>
                        <button className="btn btn-warning" type="button" onClick={() => deleteNote(note)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default GestionNotes;
