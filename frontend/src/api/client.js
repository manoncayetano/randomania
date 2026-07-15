import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export async function login(identifiant, motDePasse) {
  const { data } = await client.post('/auth/login', { identifiant, mot_de_passe: motDePasse });
  return data;
}

export async function logout() {
  await client.post('/auth/logout');
}

export async function getMe() {
  const { data } = await client.get('/auth/me');
  return data;
}

function buildParams(criteres) {
  const params = new URLSearchParams();
  if (criteres.zone) params.append('zone', criteres.zone);
  if (criteres.zone_lat != null) params.append('zone_lat', criteres.zone_lat);
  if (criteres.zone_lon != null) params.append('zone_lon', criteres.zone_lon);
  if (criteres.zone_rayon_km != null) params.append('zone_rayon_km', criteres.zone_rayon_km);
  if (criteres.zone_polygone) params.append('zone_polygone', JSON.stringify(criteres.zone_polygone));
  if (criteres.q) params.append('q', criteres.q);
  (criteres.niveau || []).forEach((n) => params.append('niveau', n));
  if (criteres.distance_min) params.append('distance_min', criteres.distance_min);
  if (criteres.distance_max) params.append('distance_max', criteres.distance_max);
  if (criteres.denivele_positif_min) params.append('denivele_positif_min', criteres.denivele_positif_min);
  if (criteres.denivele_positif_max) params.append('denivele_positif_max', criteres.denivele_positif_max);
  if (criteres.denivele_negatif_min) params.append('denivele_negatif_min', criteres.denivele_negatif_min);
  if (criteres.denivele_negatif_max) params.append('denivele_negatif_max', criteres.denivele_negatif_max);
  (criteres.tags || []).forEach((tag) => params.append('tags', tag));
  (criteres.favoris_de || []).forEach((u) => params.append('favoris_de', u));
  (criteres.indice_difficulte_labels || []).forEach((l) => params.append('indice_difficulte_labels', l));
  if (criteres.temps_min) params.append('temps_min', criteres.temps_min);
  if (criteres.temps_max) params.append('temps_max', criteres.temps_max);
  if (criteres.a_gpx !== undefined) params.append('a_gpx', criteres.a_gpx);
  if (criteres.a_lien !== undefined) params.append('a_lien', criteres.a_lien);
  return params;
}

export async function searchParcours(criteres, signal) {
  const { data } = await client.get('/parcours', { params: buildParams(criteres), signal });
  return data;
}

export async function countParcours(criteres, signal) {
  const { data } = await client.get('/parcours/count', { params: buildParams(criteres), signal });
  return data.count;
}

export async function getParcours(id) {
  const { data } = await client.get(`/parcours/${id}`);
  return data;
}

export async function listTags() {
  const { data } = await client.get('/tags');
  return data;
}

export async function listUtilisateurs() {
  const { data } = await client.get('/utilisateurs');
  return data;
}

export async function listRefuges() {
  const { data } = await client.get('/refuges');
  return data;
}

export async function addFavori(parcoursId) {
  await client.post(`/parcours/${parcoursId}/favoris`);
}

export async function removeFavori(parcoursId) {
  await client.delete(`/parcours/${parcoursId}/favoris`);
}

export async function addRealisation(parcoursId, dateRealisation) {
  await client.post(`/parcours/${parcoursId}/realisations`, {
    date_realisation: dateRealisation || undefined,
  });
}

export async function removeRealisation(parcoursId) {
  await client.delete(`/parcours/${parcoursId}/realisations`);
}

export async function uploadPhoto(parcoursId, file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post(`/parcours/${parcoursId}/photos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function setCoverPhoto(parcoursId, photoId) {
  await client.put(`/parcours/${parcoursId}/cover`, { photo_id: photoId });
}

export async function deletePhoto(photoId) {
  await client.delete(`/photos/${photoId}`);
}

export async function importRando(url) {
  const { data } = await client.post('/import', { url });
  return data;
}

export async function importZone(lieu, rayonKm, niveaux) {
  const { data } = await client.post('/import/zone', { lieu, rayon_km: rayonKm, niveaux });
  return data;
}

export async function suggererEnchainement(prompt, chainageStrict) {
  const { data } = await client.post('/suggestions/enchainement', {
    prompt,
    chainage_strict: chainageStrict,
  });
  return data;
}

export async function listAmeliorations(statuts, demandeurs) {
  const params = new URLSearchParams();
  (statuts || []).forEach((s) => params.append('statuts', s));
  (demandeurs || []).forEach((d) => params.append('demandeurs', d));
  const { data } = await client.get('/ameliorations', { params });
  return data;
}

export async function listDemandeursAmeliorations() {
  const { data } = await client.get('/ameliorations/demandeurs');
  return data;
}

export async function createAmelioration(titre, description) {
  const { data } = await client.post('/ameliorations', { titre, description });
  return data;
}

export async function updateAmelioration(id, fields) {
  const { data } = await client.put(`/ameliorations/${id}`, fields);
  return data;
}

export async function deleteAmelioration(id) {
  await client.delete(`/ameliorations/${id}`);
}

export async function uploadAmeliorationImage(id, file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post(`/ameliorations/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAmeliorationImage(id) {
  const { data } = await client.delete(`/ameliorations/${id}/image`);
  return data;
}

export async function calculerIndiceDifficulte(distanceKm, deniveleP) {
  const { data } = await client.get('/outils/indice-difficulte', {
    params: { distance_km: distanceKm, denivele_positif: deniveleP },
  });
  return data;
}

export async function getLiaisonsItineraire(segments) {
  const { data } = await client.post('/outils/liaisons-itineraire', { segments });
  return data.segments;
}

export async function uploadGpx(parcoursId, file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post(`/parcours/${parcoursId}/gpx`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteGpx(parcoursId) {
  await client.delete(`/parcours/${parcoursId}/gpx`);
}

export async function getEffortDetail(parcoursId) {
  const { data } = await client.get(`/parcours/${parcoursId}/effort`);
  return data;
}

export async function getParcoursProches(parcoursId, criteres, rayonKm) {
  const params = buildParams(criteres);
  params.append('rayon_km', rayonKm);
  const { data } = await client.get(`/parcours/${parcoursId}/proches`, { params });
  return data;
}

export async function listProjets() {
  const { data } = await client.get('/projets');
  return data;
}

export async function createProjet(nom) {
  const { data } = await client.post('/projets', { nom });
  return data;
}

export async function getProjet(projetId) {
  const { data } = await client.get(`/projets/${projetId}`);
  return data;
}

export async function renameProjet(projetId, nom) {
  const { data } = await client.put(`/projets/${projetId}`, { nom });
  return data;
}

export async function getStatsChevauchement(projetId, etapeIds) {
  const { data } = await client.post(`/projets/${projetId}/stats-chevauchement`, { etape_ids: etapeIds });
  return data;
}

export async function deleteProjet(projetId) {
  await client.delete(`/projets/${projetId}`);
}

export async function addEtape(projetId, parcoursId, jour, notes) {
  const { data } = await client.post(`/projets/${projetId}/etapes`, {
    parcours_id: parcoursId,
    jour: jour || undefined,
    notes: notes || undefined,
  });
  return data;
}

export async function updateEtape(projetId, etapeId, { jour, notes, ordre } = {}) {
  const { data } = await client.put(`/projets/${projetId}/etapes/${etapeId}`, { jour, notes, ordre });
  return data;
}

export async function removeEtape(projetId, etapeId) {
  await client.delete(`/projets/${projetId}/etapes/${etapeId}`);
}

export async function updateParcours(parcoursId, fields) {
  const { data } = await client.put(`/parcours/${parcoursId}`, fields);
  return data;
}

export async function addTag(parcoursId, tag) {
  await client.post(`/parcours/${parcoursId}/tags`, { tag });
}

export async function removeTag(parcoursId, tag) {
  await client.delete(`/parcours/${parcoursId}/tags/${encodeURIComponent(tag)}`);
}

export default client;
