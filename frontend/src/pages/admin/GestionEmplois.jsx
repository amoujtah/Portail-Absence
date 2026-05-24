import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://127.0.0.1:8000/api';

const emptyForm = {
  filiere: '',
  groupe: '',
  module: '',
  annee: '1',
  niveau: '1A',
  jour: 'lundi',
  heure_debut: '08:30',
  heure_fin: '10:00',
  salle: '',
  enseignant: '',
  type_seance: 'cours',
};

const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const typesSeance = ['cours', 'td', 'tp', 'projet', 'atelier'];
const niveaux = ['1A', '2A', '3A', '4A', '5A'];

function GestionEmplois() {
  const [emplois, setEmplois] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [modules, setModules] = useState([]);
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
      axios.get(`${API_URL}/emplois/`, { headers }),
      axios.get(`${API_URL}/filieres/`, { headers }),
      axios.get(`${API_URL}/groupes/`, { headers }),
      axios.get(`${API_URL}/modules/`, { headers }),
    ]).then(([emploisRes, filieresRes, groupesRes, modulesRes]) => {
      setEmplois(emploisRes.data);
      setFilieres(filieresRes.data);
      setGroupes(groupesRes.data);
      setModules(modulesRes.data);
      setLoading(false);
    }).catch(() => {
      setMessage("Impossible de charger les emplois du temps.");
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

  const applyGroupDefaults = (groupeId, currentForm) => {
    const groupe = groupes.find((item) => String(item.id) === String(groupeId));
    if (!groupe) return currentForm;
    return {
      ...currentForm,
      groupe: String(groupe.id),
      filiere: String(groupe.filiere || currentForm.filiere),
      annee: String(groupe.annee || currentForm.annee),
      niveau: groupe.niveau || currentForm.niveau,
    };
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      return name === 'groupe' ? applyGroupDefaults(value, next) : next;
    });
  };

  const startEdit = (emploi) => {
    setEditingId(String(emploi.id));
    setForm({
      filiere: String(emploi.filiere || ''),
      groupe: String(emploi.groupe || ''),
      module: String(emploi.module || ''),
      annee: String(emploi.annee || '1'),
      niveau: emploi.niveau || '1A',
      jour: emploi.jour || 'lundi',
      heure_debut: (emploi.heure_debut || '08:30').slice(0, 5),
      heure_fin: (emploi.heure_fin || '10:00').slice(0, 5),
      salle: emploi.salle || '',
      enseignant: emploi.enseignant || '',
      type_seance: emploi.type_seance || 'cours',
    });
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      annee: Number(form.annee),
      filiere: form.filiere,
      groupe: form.groupe || null,
      module: form.module,
    };

    try {
      if (editingId) {
        await axios.patch(`${API_URL}/emplois/${editingId}/`, payload, { headers });
        setMessage('Seance modifiee avec succes.');
      } else {
        await axios.post(`${API_URL}/emplois/`, payload, { headers });
        setMessage('Seance ajoutee avec succes.');
      }
      setMessageType('success');
      resetForm();
      loadData();
    } catch (err) {
      setMessage("Erreur lors de l'enregistrement de la seance.");
      setMessageType('error');
    }
  };

  const deleteEmploi = async (emploi) => {
    const confirmed = window.confirm('Supprimer cette seance ?');
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/emplois/${emploi.id}/`, { headers });
      setEmplois((current) => current.filter((item) => String(item.id) !== String(emploi.id)));
      if (String(editingId) === String(emploi.id)) resetForm();
      setMessage('Seance supprimee avec succes.');
      setMessageType('success');
    } catch (err) {
      setMessage("Erreur lors de la suppression de la seance.");
      setMessageType('error');
    }
  };

  const groupesPlanifies = new Set(emplois.map((emploi) => emploi.groupe).filter(Boolean)).size;
  const modulesPlanifies = new Set(emplois.map((emploi) => emploi.module).filter(Boolean)).size;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">
          <div className="brand-mark">PA</div>
          <div className="brand-text">
            <span className="brand-title">Portail Absences</span>
            <span className="brand-subtitle">Gestion emplois</span>
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
            <p className="kicker">Planning</p>
            <h1 className="page-title">Gestion des emplois du temps</h1>
            <p className="page-description">Planifiez les seances par groupe, module, salle et enseignant.</p>
          </div>
        </header>

        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'}`}>{message}</div>
        )}

        <section className="stats-grid" aria-label="Resume des emplois du temps">
          <article className="stat-card accent">
            <div className="icon-tile">SE</div>
            <div>
              <div className="stat-value">{emplois.length}</div>
              <p className="stat-label">Seances</p>
            </div>
          </article>
          <article className="stat-card success">
            <div className="icon-tile">GR</div>
            <div>
              <div className="stat-value">{groupesPlanifies}</div>
              <p className="stat-label">Groupes planifies</p>
            </div>
          </article>
          <article className="stat-card">
            <div className="icon-tile">MO</div>
            <div>
              <div className="stat-value">{modulesPlanifies}</div>
              <p className="stat-label">Modules planifies</p>
            </div>
          </article>
        </section>

        <section className="panel admin-crud-panel">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Modifier une seance' : 'Ajouter une seance'}</h2>
            {editingId && <button className="btn btn-soft" type="button" onClick={resetForm}>Annuler</button>}
          </div>
          <form className="form-grid admin-form-grid" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-groupe">Groupe</label>
              <select id="emploi-groupe" name="groupe" className="form-control" value={form.groupe} onChange={handleChange} required>
                <option value="">Choisir un groupe</option>
                {groupes.map((groupe) => (
                  <option key={groupe.id} value={groupe.id}>{groupe.code} - {groupe.filiere_code || groupe.niveau}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-filiere">Filiere</label>
              <select id="emploi-filiere" name="filiere" className="form-control" value={form.filiere} onChange={handleChange} required>
                <option value="">Choisir une filiere</option>
                {filieres.map((filiere) => (
                  <option key={filiere.id} value={filiere.id}>{filiere.code || filiere.nom} - {filiere.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-module">Module</label>
              <select id="emploi-module" name="module" className="form-control" value={form.module} onChange={handleChange} required>
                <option value="">Choisir un module</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>{module.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-niveau">Niveau</label>
              <select id="emploi-niveau" name="niveau" className="form-control" value={form.niveau} onChange={handleChange} required>
                {niveaux.map((niveau) => <option key={niveau} value={niveau}>{niveau}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-annee">Annee</label>
              <input id="emploi-annee" name="annee" className="form-control" type="number" min="1" max="5" value={form.annee} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-jour">Jour</label>
              <select id="emploi-jour" name="jour" className="form-control" value={form.jour} onChange={handleChange} required>
                {jours.map((jour) => <option key={jour} value={jour}>{jour}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-debut">Debut</label>
              <input id="emploi-debut" name="heure_debut" className="form-control" type="time" value={form.heure_debut} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-fin">Fin</label>
              <input id="emploi-fin" name="heure_fin" className="form-control" type="time" value={form.heure_fin} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-type">Type</label>
              <select id="emploi-type" name="type_seance" className="form-control" value={form.type_seance} onChange={handleChange} required>
                {typesSeance.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-salle">Salle</label>
              <input id="emploi-salle" name="salle" className="form-control" value={form.salle} onChange={handleChange} placeholder="Ex: B204" required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emploi-enseignant">Enseignant</label>
              <input id="emploi-enseignant" name="enseignant" className="form-control" value={form.enseignant} onChange={handleChange} placeholder="Nom enseignant" required />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">{editingId ? 'Enregistrer' : 'Ajouter la seance'}</button>
            </div>
          </form>
        </section>

        <section className="panel admin-crud-panel panel-spaced">
          <div className="panel-header">
            <h2 className="panel-title">Planning des seances</h2>
            <span className="badge badge-primary">{emplois.length} seance(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table admin-table timetable-table">
              <thead>
                <tr>
                  <th>Groupe</th>
                  <th>Jour</th>
                  <th>Horaire</th>
                  <th>Module</th>
                  <th>Type</th>
                  <th>Salle</th>
                  <th>Enseignant</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="empty-state">Chargement...</td></tr>
                ) : emplois.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">Aucune seance planifiee</td></tr>
                ) : emplois.map((emploi) => (
                  <tr key={emploi.id}>
                    <td>
                      <span className="admin-list-title">
                        <strong>{emploi.groupe_code || '-'}</strong>
                        <span className="cell-muted">{emploi.filiere_code || emploi.niveau || '-'}</span>
                      </span>
                    </td>
                    <td>{emploi.jour}</td>
                    <td>{emploi.heure_debut?.slice(0, 5)} - {emploi.heure_fin?.slice(0, 5)}</td>
                    <td>{emploi.module_nom || `Module ${emploi.module}`}</td>
                    <td><span className="badge badge-primary">{emploi.type_seance}</span></td>
                    <td>{emploi.salle || '-'}</td>
                    <td>{emploi.enseignant || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-soft" type="button" onClick={() => startEdit(emploi)}>Modifier</button>
                        <button className="btn btn-warning" type="button" onClick={() => deleteEmploi(emploi)}>Supprimer</button>
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

export default GestionEmplois;
