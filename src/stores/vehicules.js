import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Store Véhicules — Parc automobile PL & Engins de Clean Africa
 *
 * Source: Tableau "CARACTERISTIQUES DU PARC AUTOMOBILE PL & ENGINS"
 * Chaque véhicule a un N° Parc unique qui sert d'identifiant.
 * Le type (BOM, Plateaux, Movi, Bennes) est critique pour le calcul du score tonnage.
 */
export const useVehiculesStore = defineStore('vehicules', () => {

  const vehicules = ref([
    // ══════════════════════════════════════════
    // PLATEAUX (27)
    // ══════════════════════════════════════════
    { noParc: '117', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Logistique', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JH-833-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '118', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JN-074-AA', etat: 'Panne', observation: '' },
    { noParc: '119', type: 'Plateaux', particularite: 'PORTE ENGIN', affectation: '', marque: 'MITSUBISHI', modele: 'CANTER', immatriculation: 'DB-804-AA', etat: 'Standby', observation: '' },
    { noParc: '120', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JV-422-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '121', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JW-400-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '122', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JW-401-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '123', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JW-403-AA', etat: 'Panne', observation: '' },
    { noParc: '124', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Tri', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JY-556-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '125', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JY-557-AA', etat: 'Panne', observation: '' },
    { noParc: '126', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'JY-558-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '127', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'KA-285-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '128', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Tri', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'KB-292-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '129', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'DAIHATSU', modele: 'DELTA V118', immatriculation: 'EX-920-AA', etat: 'Opérationnel', observation: 'Problème de freins' },
    { noParc: '130', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'KV-152-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '131', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'KW-850-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '132', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'KW-851-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '133', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Tri', marque: 'ISUZU MOTORS', modele: 'NPR 71H', immatriculation: 'KX-633-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '134', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-486-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '135', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-487-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '136', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-489-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '137', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Tri', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-490-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '138', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-492-AA', etat: 'Panne', observation: 'Kit embrayage à changer' },
    { noParc: '139', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-493-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '140', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Tri', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-494-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '141', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-495-AA', etat: 'Panne', observation: 'Problème de moteur' },
    { noParc: '142', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Collecte', marque: 'SML SAMRAT', modele: 'TIPPER', immatriculation: 'LD-491-AA', etat: 'Accidenté', observation: 'Accidenté' },
    { noParc: '143', type: 'Plateaux', particularite: 'PLATEAU', affectation: 'Logistique', marque: 'JMC', modele: '', immatriculation: 'JC-733-AA', etat: 'Opérationnel', observation: '' },

    // ══════════════════════════════════════════
    // HIAB (1)
    // ══════════════════════════════════════════
    { noParc: '220', type: 'Bennes', particularite: 'HIAB A PINCE', affectation: 'Collecte', marque: 'IVECO', modele: 'TRAKKER 380', immatriculation: 'EE-929-AA', etat: 'Panne', observation: 'Boite de vitesse réparée; capteurs remis mais toujours en immo' },

    // ══════════════════════════════════════════
    // MOVI (13)
    // ══════════════════════════════════════════
    { noParc: '222', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'IVECO', modele: 'TRAKKER 380', immatriculation: 'HS-681-AA', etat: 'Panne', observation: 'Pompe hydraulique + selecteur vitesse' },
    { noParc: '223', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'IVECO', modele: 'TRAKKER 380', immatriculation: 'EK-926-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '225', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'IVECO', modele: 'TRAKKER 380', immatriculation: 'EK-737-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '227', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-701-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '228', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-706-AA', etat: 'Panne', observation: '' },
    { noParc: '229', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-705-AA', etat: 'HS', observation: 'Hors service' },
    { noParc: '230', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-708-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '231', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-776-AA', etat: 'Panne', observation: 'Boite de vitesse + verins HS' },
    { noParc: '232', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-774-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '233', type: 'Movi', particularite: 'MOVI', affectation: 'Tri', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-772-AA', etat: 'Panne', observation: '' },
    { noParc: '234', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-783-AA', etat: 'Panne', observation: 'Verins tordus' },
    { noParc: '235', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-773-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '236', type: 'Movi', particularite: 'MOVI', affectation: 'Collecte', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-784-AA', etat: 'Panne', observation: '' },

    // ══════════════════════════════════════════
    // BENNES (7)
    // ══════════════════════════════════════════
    { noParc: '224', type: 'Bennes', particularite: 'BENNE BASCULE', affectation: '', marque: 'IVECO', modele: '150E24W', immatriculation: 'HP-624-AA', etat: 'Panne', observation: 'Hors service' },
    { noParc: '226', type: 'Bennes', particularite: 'BENNE BASCULE', affectation: '', marque: 'IVECO', modele: 'TRAKKER 380', immatriculation: 'EK-923-AA', etat: 'Opérationnel', observation: 'Fuite d\'huile' },
    { noParc: '237', type: 'Bennes', particularite: 'BENNE BASCULE', affectation: '', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-749-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '238', type: 'Bennes', particularite: 'BENNE BASCULE', affectation: '', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-748-AA', etat: 'Opérationnel', observation: 'Disque d\'embrayage' },
    { noParc: '239', type: 'Bennes', particularite: 'BENNE BASCULE', affectation: '', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-704-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '240', type: 'Bennes', particularite: 'BENNE BASCULE', affectation: '', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-751-AA', etat: 'Panne', observation: 'Problème de moteur' },
    { noParc: '242', type: 'Bennes', particularite: 'BENNE BASCULE', affectation: '', marque: 'DONG FENG', modele: 'KIN LAND 260', immatriculation: 'KB-709-AA', etat: 'Panne', observation: '' },

    // ══════════════════════════════════════════
    // BOM (50)
    // ══════════════════════════════════════════
    { noParc: '480', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'MAN', modele: 'TGS 33,360-6X4', immatriculation: 'JS-466-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '481', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'MERCEDES', modele: '3342 K39', immatriculation: 'AB-733-AA', etat: 'Panne', observation: '' },
    { noParc: '482', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KB-983-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '483', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-010-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '484', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-012-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '485', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-009-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '486', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-019-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '487', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-982-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '488', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-001-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '489', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-021-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '490', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KB-995-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '491', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KB-994-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '492', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-016-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '493', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-022-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '494', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-020-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '495', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-011-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '496', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-006-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '497', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KB-991-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '498', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-013-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '499', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-003-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '501', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-990-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '503', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-023-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '504', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KB-984-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '505', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-008-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '506', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KB-993-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '507', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KB-986-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '508', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-005-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '509', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-015-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '510', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-018-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '511', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-014-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '512', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: 'KC-007-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '513', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'MAN', modele: 'TGS 33,360-6X4', immatriculation: 'KC-264-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '514', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'MAN', modele: 'TGS 33,360-6X4', immatriculation: 'KC-263-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '515', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'MAN', modele: 'TGS 33,360-6X4', immatriculation: 'KC-262-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '516', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'MAN', modele: 'TGS 33,360-6X4', immatriculation: 'KC-265-AA', etat: 'Opérationnel', observation: '' },
    { noParc: '517', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '518', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '519', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '520', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '521', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '522', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '523', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '524', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '525', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '526', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '527', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '528', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '529', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '530', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },
    { noParc: '531', type: 'BOM', particularite: 'BOM', affectation: '', marque: 'HONGYAN IVECO', modele: 'KING KAN 340', immatriculation: '', etat: 'Opérationnel', observation: '' },

    // ══════════════════════════════════════════
    // BALAYEUSE (1)
    // ══════════════════════════════════════════
    { noParc: '702', type: 'BOM', particularite: 'BALAYEUSE', affectation: '', marque: 'HOWO', modele: 'ROAD SWEEPER', immatriculation: 'JU-418-AA', etat: 'Opérationnel', observation: '' },
  ])

  // ── Types de véhicules PL pour le calcul de prime ──
  const typesPL = ['BOM', 'Plateaux', 'Movi', 'Bennes']

  // ── Véhicules PL uniquement (pour les formulaires de saisie tonnage) ──
  const vehiculesPL = computed(() =>
    vehicules.value.filter(v => typesPL.includes(v.type))
  )

  // ── Véhicules opérationnels uniquement ──
  const vehiculesOperationnels = computed(() =>
    vehiculesPL.value.filter(v => v.etat === 'Opérationnel')
  )

  // ── Recherche par N° Parc ──
  function getByNoParc(noParc) {
    return vehicules.value.find(v => v.noParc === noParc) || null
  }

  // ── Recherche par immatriculation ──
  function getByImmat(immat) {
    return vehicules.value.find(v => v.immatriculation === immat) || null
  }

  // ── Recherche textuelle ──
  function search(query) {
    if (!query) return vehiculesOperationnels.value
    const q = query.toLowerCase()
    return vehiculesPL.value.filter(v =>
      v.noParc.includes(q) ||
      v.immatriculation.toLowerCase().includes(q) ||
      v.marque.toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q)
    )
  }

  // ── Stats par type ──
  const statsByType = computed(() => {
    const stats = {}
    typesPL.forEach(t => {
      const ofType = vehicules.value.filter(v => v.type === t)
      stats[t] = {
        total: ofType.length,
        operationnels: ofType.filter(v => v.etat === 'Opérationnel').length,
        panne: ofType.filter(v => ['Panne', 'HS', 'Accidenté'].includes(v.etat)).length,
      }
    })
    return stats
  })

  // ── Libellé affiché pour un véhicule ──
  function label(v) {
    if (!v) return ''
    const immat = v.immatriculation || 'Sans immat'
    return `${v.type} N°${v.noParc} — ${immat} (${v.marque})`
  }

  return {
    vehicules,
    vehiculesPL,
    vehiculesOperationnels,
    typesPL,
    getByNoParc,
    getByImmat,
    search,
    statsByType,
    label,
  }
})
