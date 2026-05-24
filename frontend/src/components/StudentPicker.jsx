import React, { useEffect, useMemo, useState } from 'react';

export const STUDENT_LEVELS = ['1A', '2A', '3A', '4A', '5A'];

export const normalizeStudentText = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const getStudentName = (student) =>
  student
    ? `${student.nom || ''} ${student.prenom || ''}`.trim() || student.user_nom || `Etudiant ${student.id}`
    : '';

export const getStudentLabel = (student) => {
  if (!student) return '';
  const identity = getStudentName(student);
  const matricule = student.matricule || `#${student.id}`;
  const group = student.groupe_code || student.niveau || 'Sans groupe';
  return `${identity} - ${matricule} - ${group}`;
};

const sortStudents = (students) =>
  [...students].sort((a, b) =>
    (a.nom || '').localeCompare(b.nom || '') ||
    (a.prenom || '').localeCompare(b.prenom || '') ||
    (a.matricule || '').localeCompare(b.matricule || '')
  );

const buildGroupOptions = (students, groupes) => {
  if (groupes.length > 0) return groupes;

  const groupsById = new Map();
  students.forEach((student) => {
    if (!student.groupe || groupsById.has(String(student.groupe))) return;
    groupsById.set(String(student.groupe), {
      id: student.groupe,
      code: student.groupe_code || `Groupe ${student.groupe}`,
      filiere_code: student.filiere_code || '',
      niveau: student.niveau || '',
    });
  });
  return Array.from(groupsById.values());
};

function StudentPicker({
  students = [],
  groupes = [],
  selectedStudentId = '',
  onSelect,
  title = 'Choisir un etudiant',
  subtitle = '',
  resultLimit = 12,
  allowAllGroups = true,
}) {
  const [selectedNiveau, setSelectedNiveau] = useState(STUDENT_LEVELS[0]);
  const [groupeFilter, setGroupeFilter] = useState('');
  const [query, setQuery] = useState('');

  const sortedStudents = useMemo(() => sortStudents(students), [students]);
  const groupOptions = useMemo(() => buildGroupOptions(students, groupes), [students, groupes]);

  const levelOptions = useMemo(() => {
    const foundLevels = new Set([
      ...groupOptions.map((groupe) => groupe.niveau).filter(Boolean),
      ...students.map((student) => student.niveau).filter(Boolean),
    ]);
    const ordered = STUDENT_LEVELS.filter((niveau) => foundLevels.has(niveau));
    const custom = Array.from(foundLevels).filter((niveau) => !STUDENT_LEVELS.includes(niveau)).sort();
    return ordered.concat(custom);
  }, [groupOptions, students]);

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === String(selectedStudentId)) || null,
    [selectedStudentId, students]
  );

  useEffect(() => {
    if (!selectedStudent) return;
    if (selectedStudent.niveau) setSelectedNiveau(selectedStudent.niveau);
    if (selectedStudent.groupe) setGroupeFilter(String(selectedStudent.groupe));
  }, [selectedStudentId, selectedStudent]);

  useEffect(() => {
    if (levelOptions.length > 0 && !levelOptions.includes(selectedNiveau)) {
      setSelectedNiveau(levelOptions[0]);
    }
  }, [levelOptions, selectedNiveau]);

  const groupsForLevel = useMemo(
    () => groupOptions.filter((groupe) => !selectedNiveau || groupe.niveau === selectedNiveau),
    [groupOptions, selectedNiveau]
  );

  useEffect(() => {
    if (!groupeFilter) return;
    const stillExists = groupsForLevel.some((groupe) => String(groupe.id) === String(groupeFilter));
    if (!stillExists) setGroupeFilter('');
  }, [groupeFilter, groupsForLevel]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = normalizeStudentText(query).trim();
    return sortedStudents.filter((student) => {
      const matchesLevel = !selectedNiveau || student.niveau === selectedNiveau;
      const matchesGroup = !groupeFilter || String(student.groupe) === String(groupeFilter);
      if (!matchesLevel || !matchesGroup) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        student.nom,
        student.prenom,
        student.user_nom,
        student.username,
        student.matricule,
        student.groupe_code,
        student.filiere_code,
        student.filiere_nom,
        student.email,
        student.telephone,
        student.cin,
      ].join(' ');
      return normalizeStudentText(haystack).includes(normalizedQuery);
    });
  }, [groupeFilter, query, selectedNiveau, sortedStudents]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (filteredStudents.length > 0 && onSelect) onSelect(filteredStudents[0]);
  };

  const clearFilters = () => {
    setQuery('');
    setGroupeFilter('');
    if (levelOptions.length > 0) setSelectedNiveau(levelOptions[0]);
  };

  return (
    <section className="student-picker">
      <div className="student-picker-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="badge badge-primary">{filteredStudents.length} etudiant(s)</span>
      </div>

      <form className="student-picker-bar" onSubmit={handleSubmit}>
        <div className="student-picker-levels">
          <label className="form-label">Niveau</label>
          <div className="level-filter" aria-label="Filtrer par niveau">
            {(levelOptions.length > 0 ? levelOptions : STUDENT_LEVELS).map((niveau) => (
              <button
                className={selectedNiveau === niveau ? 'active' : ''}
                key={niveau}
                onClick={() => {
                  setSelectedNiveau(niveau);
                  setGroupeFilter('');
                }}
                type="button"
              >
                {niveau}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="student-picker-group">Groupe</label>
          <select
            id="student-picker-group"
            className="form-control"
            value={groupeFilter}
            onChange={(event) => setGroupeFilter(event.target.value)}
          >
            {allowAllGroups && <option value="">Tous les groupes</option>}
            {groupsForLevel.map((groupe) => (
              <option key={groupe.id} value={groupe.id}>
                {groupe.code || groupe.nom} - {groupe.filiere_code || groupe.niveau || ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="student-picker-search">Rechercher</label>
          <input
            id="student-picker-search"
            className="form-control"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, prenom, matricule..."
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={filteredStudents.length === 0}>
          Afficher
        </button>
        <button className="btn btn-soft" type="button" onClick={clearFilters}>
          Effacer
        </button>
      </form>

      {selectedStudent && (
        <div className="student-picker-selected">
          Selection: {getStudentLabel(selectedStudent)}
        </div>
      )}

      <div className="student-picker-results">
        {students.length === 0 ? (
          <p className="dossier-empty-hint">Aucun etudiant disponible.</p>
        ) : filteredStudents.length === 0 ? (
          <p className="dossier-empty-hint">Aucun etudiant trouve.</p>
        ) : filteredStudents.slice(0, resultLimit).map((student) => (
          <button
            className={String(student.id) === String(selectedStudentId) ? 'student-result-card active' : 'student-result-card'}
            key={student.id}
            type="button"
            onClick={() => onSelect && onSelect(student)}
          >
            <span>
              <strong>{getStudentName(student)}</strong>
              <small>{student.matricule || `#${student.id}`} - {student.groupe_code || student.niveau || 'Sans groupe'}</small>
            </span>
            <em>{student.filiere_code || 'N/A'}</em>
          </button>
        ))}
        {filteredStudents.length > resultLimit && (
          <p className="teacher-results-note">Affichage des {resultLimit} premiers resultats. Precisez la recherche si besoin.</p>
        )}
      </div>
    </section>
  );
}

export default StudentPicker;
