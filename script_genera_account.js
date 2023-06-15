

/**
 * Copyright (c) 1988-2022 deister software, All Rights Reserved.
 *
 * FUNCTION JS: ctables_wb_account_insert
 *
 * Description: Integra las tablas temporales generando los registros en las tablas de iCON
 **/
 function ctables_wb_account_insert(p_tempTables, p_tabname, p_facidx, p_regid) {

	/**
	 * Carga apuntes contables a partir de la tabla temporal l_tmp_capuntes
	 **************************************************************************/
	function local_load_capuntes(l_tmp_capuntes, l_tabname, l_gencon) {
		// Clean tmp_capuntes data.
		Ax.db.execute(`DELETE ${l_tmp_capuntes} WHERE empcode IS NULL OR (haber = 0 AND debe = 0 AND origen != 'I')`);

		var rs = Ax.db.executeQuery(`SELECT DISTINCT t.empcode, t.fecha, cempresa.descon, icon_get_divred(icon_get_moneda(cempresa.empcode)) divred
		                               FROM ${l_tmp_capuntes} t, cempresa
		                              WHERE t.empcode = cempresa.empcode`).toMemory();
		                              
		for (var tmp_capuntes of rs) {
			if (rs.getRow() > 1) {
				throw new Error("More than one row grouping by empcode and fecha in workbook sheet capuntes.");
			}
		}

		// No lines to send to journal
		if (!rs.getRowCount()) {
			return {"loteid" : null, "apteid" : null, "asient" : null, "divred" : null};
		}
    
		// ========================================================================
		// Si la contabilidad admite solo positivos descon = 1 entonces se
		// cambia debe y haber.
		// ========================================================================
		if (tmp_capuntes.descon == 1) {
			Ax.db.execute(`
					UPDATE ${l_tmp_capuntes}
					   SET haber  = -debe,
						   debe   = 0,
						   divhab = -divdeb,
						   divdeb = 0
					 WHERE debe < 0
				`);
				
			Ax.db.execute(`
					UPDATE ${l_tmp_capuntes}
					   SET debe   = -haber,
						   haber  = 0,
						   divdeb = -divhab,
						   divhab = 0
					 WHERE haber < 0
				`);				
		}
		
		// ========================================================================
		// Create ccuentas before insert into capuntes.
		// ========================================================================
		var SQL_nombre = l_tabname != "cefecges_pcs" ? "MAX(concep)" : "DISTINCT (SELECT b.nombre FROM ccuentas b WHERE b.placon = tmp_capuntes.placon AND b.codigo = tmp_capuntes.contra)";
		var SQL_group =  l_tabname != "cefecges_pcs" ? "GROUP BY 2, 3, 4, 5, 6" : " ";
		
		/** SELECT PARA OBTENER CUENTA Y DESCRIPCION PARA ccuentas */
		var mObjDataCcuentas = Ax.db.executeQuery(`
                                		SELECT FIRST 1
                                            cpar_parpreh.nompre,
                                            cpar_parprel.ctainv
                                    
                                          FROM cpar_parpreh
                                              ,cpar_parprel ,cpar_premovi
                                         WHERE 
                                               cpar_parpreh.empcode = cpar_parprel.empcode AND 
                                               cpar_parpreh.codpre = cpar_parprel.codpre AND 
                                               cpar_parprel.empcode = cpar_premovi.empcode AND 
                                               cpar_parprel.codpre = cpar_premovi.codpre AND 
                                               cpar_premovi.codpar IN (cpar_parprel.codpar, cpar_parprel.paract)
                                            AND cpar_premovi.linid = ?`
                                        , p_facidx).toOne();
		
		/** SELECT TEMPORAL */
		var mArrTmpCapuntes = Ax.db.executeQuery(` 
                                    SELECT ${SQL_nombre} nombre, placon, cuenta codigo, 'T' tipcta, 'A' tipact, 'E' activa
			                          FROM ${l_tmp_capuntes} tmp_capuntes
			                         WHERE NOT EXISTS (SELECT ccuentas.codigo
											             FROM ccuentas
										                WHERE ccuentas.placon = tmp_capuntes.placon
											                  AND ccuentas.codigo = tmp_capuntes.cuenta)
			                        ${SQL_group}`).toJSONArray();
		
		console.log('SELECT DE CONDICION: ', mArrTmpCapuntes);
		console.log('DATA PARA CCUENTAS', mObjDataCcuentas);
		for (var i = 0; i < mArrTmpCapuntes.length; i++) {
		    var codigo = mArrTmpCapuntes[i].codigo == null ? mObjDataCcuentas.ctainv : mArrTmpCapuntes[i].codigo;
            var nombre = mArrTmpCapuntes[i].nombre == null ? mObjDataCcuentas.nompre : mArrTmpCapuntes[i].nombre;
            
            /** ACTUALIZA CODIGO Y NOMBRE DE LA TEMPORAL */
            
            /**
             * TODO: Actualizar los campos codigo y nombre que se encuentren null por el de la inversion y partida,
             * esto es usado en mas procesos que siguen adelante
             */
            Ax.db.execute(`
            UPDATE ${l_tmp_capuntes}
				   SET codigo = ${codigo},
					   nombre = ${nombre}
				 WHERE NOT EXISTS (SELECT ccuentas.codigo
											             FROM ccuentas
										                WHERE ccuentas.placon = ${l_tmp_capuntes}.placon
											                  AND ccuentas.codigo = ${l_tmp_capuntes}.cuenta)
			                        ${SQL_group}
			    `);
            // Ax.db.insert("ccuentas", mArrTmpCapuntes[i]);
		}
		
		var mRsDeTblTemporal = Ax.db.executeQuery(` 
                                    SELECT *
			  FROM ${tempTables.capuntes} tmp_capuntes`);
			 
	console.log('RS DESPUES DE UPDATE', mRsDeTblTemporal);
        /*mArrTmpCapuntes.forEach(mObjTmpCapuntes => {
            mObjTmpCapuntes.codigo == null ? mObjDataCcuentas.ctainv : mObjTmpCapuntes.codigo;
            mObjTmpCapuntes.nombre == null ? mObjDataCcuentas.nompre : mObjTmpCapuntes.nombre
            
        }); */
        console.log('OBJ - RES', mArrTmpCapuntes);
        
		console.log('SQL_nombre: ', SQL_nombre);
		console.log('l_tmp_capuntes: ', l_tmp_capuntes);
		console.log('SQL_group: ', SQL_group);
		
		/*Ax.db.execute(`
			INSERT INTO ccuentas(nombre, placon, codigo, tipcta, tipact, activa)
			SELECT ${SQL_nombre}, placon, cuenta, 'T' tipcta, 'A' tipact, 'E' activa
			  FROM ${l_tmp_capuntes} tmp_capuntes
			 WHERE NOT EXISTS (SELECT ccuentas.codigo
											FROM ccuentas
										   WHERE ccuentas.placon = tmp_capuntes.placon
											 AND ccuentas.codigo = tmp_capuntes.cuenta)
			  ${SQL_group}`);*/

		// ========================================================================
		// Get accounting lot number.
		// ========================================================================
		var m_loteid = Ax.db.insert("cenllote", {"tabname" : l_tabname }).getSerial();

		// ========================================================================
		// Get a single asient number for all capuntes rows.
		// ========================================================================
		var m_asient = Ax.db.executeFunction("icon_nxt_asient", tmp_capuntes.empcode, tmp_capuntes.fecha, 0).toValue();
	
		// ========================================================================
		// Insert journal (capuntes) from non-grouping lines.
		// ========================================================================
		var sqlca = Ax.db.execute(`
			INSERT INTO capuntes(apteid,   loteid,  asient,
								 diario,   moneda,   cambio, empcode, proyec,   seccio,
								 jusser,   docser,   fecha,  orden,   placon,   cuenta,
								 dimcode1, dimcode2, codcon, concep,  sistem,   contra,
								 codaux,   ctaaux,   origen, fecval,  cantid1,  cantid2,
								 debe,     haber,   divdeb,   divhab)
			SELECT  0,        CAST(? AS INTEGER), CAST(? AS INTEGER),
			        diario,   moneda,   cambio, empcode, proyec,   seccio,
			        jusser,   docser,   fecha,  orden,   placon,   cuenta,
			        dimcode1, dimcode2, codcon, concep,  sistem,   contra,
			        codaux,   ctaaux,   origen, fecval,  cantid1,  cantid2,
					ROUND(debe,   ?) debe,
					ROUND(haber,  ?) haber,
					ROUND(divdeb, ?) divdeb,
					ROUND(divhab, ?) divhab
			  FROM ${l_tmp_capuntes}
			 WHERE agrupa = "N"
			`, m_loteid, m_asient, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred);
	
		// ========================================================================
		// Insert journal (capuntes) from grouping lines.
		// ========================================================================
		var SQL_colOrden = l_tabname.match(/(cefecges_pcs|cper_emplgasr)/) ?  "orden" : "MIN(orden) orden";
		var SQL_grpOrden = l_tabname.match(/(cefecges_pcs|cper_emplgasr)/) ?  "12, "  : "";
			
		var sqlca = Ax.db.execute(`
			INSERT INTO capuntes(apteid,   loteid,   asient,  
								 diario,   moneda,   cambio, empcode, proyec,   seccio,
								 jusser,   docser,   orden,  fecha,   placon,   cuenta,
								 dimcode1, dimcode2, codcon, concep,  sistem,   contra,
								 codaux,   ctaaux,   origen, fecval,  cantid1,  cantid2,
								 debe,     haber,   divdeb,   divhab)
			SELECT 0,      CAST(? AS INTEGER), CAST(? AS INTEGER),
				   diario, moneda,   cambio,          empcode, proyec, seccio,
				   jusser, docser,   ${SQL_colOrden}, fecha,   placon, cuenta, 
				   dimcode1, dimcode2,        codcon, concep,  sistem, contra,   
				   codaux,   ctaaux,  origen, fecval,
				   
				   ROUND(SUM(cantid1), ?) cantid1,
				   ROUND(SUM(cantid2), ?) cantid2,
					CASE WHEN SUM(debe   - haber)  > 0
							  THEN ROUND(SUM(debe   - haber),  ?)
						 ELSE 0
					 END debe,
					CASE WHEN SUM(debe   - haber)  < 0
							  THEN ROUND(SUM(haber  - debe),   ?)
						 ELSE 0
					 END haber,
					CASE WHEN SUM(divdeb - divhab) > 0
							  THEN ROUND(SUM(divdeb - divhab), ?)
						 ELSE 0
					 END divdeb,
					CASE WHEN SUM(divdeb - divhab) < 0
							  THEN ROUND(SUM(divhab - divdeb), ?)
						 ELSE 0
					 END divhab
			  FROM ${l_tmp_capuntes}
			 WHERE agrupa = 'S'
			 GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ${SQL_grpOrden} 13, 14, 15, 16, 17, 18,
					  19, 20, 21, 22, 23, 24, 25
			 ORDER BY 12, 8, 9, 10, cuenta, debe, haber
			`, m_loteid, m_asient, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred);
		
		// ========================================================================
		// Si la tabla temporal de capuntes contiene la columna gencon, podemos intentar
		// generar el apunte de contrapartida en aquellas lineas que lo indiquen
		// Generalmente se usa en plantillas de ccajarem, cinamor y cpar_premovi
		// ========================================================================
		if (l_gencon) {
			var sqlca = Ax.db.execute(`
				INSERT INTO capuntes(apteid,   loteid,   asient,
									 diario,   moneda,   cambio, empcode, proyec,   seccio,
									 jusser,   docser,   orden,  fecha,   placon,   cuenta,
									 dimcode1, dimcode2, codcon, concep,  sistem,   contra,
									 codaux,   ctaaux,   origen, fecval,  cantid1,  cantid2,
									 debe,     haber,    divdeb, divhab)
				SELECT 0,        CAST(? AS INTEGER), CAST(? AS INTEGER),
					   diario,   moneda,   cambio, empcode, proyec,  seccio,
					   jusser,   docser,   ${SQL_colOrden}, fecha,  placon,  contra,
					   dimcode1, dimcode2, codcon, concep, sistem,  cuenta,
					   codaux,   ctaaux,   origen, fecval,
					   
					   ROUND(SUM(cantid1), ?) cantid1,
					   ROUND(SUM(cantid2), ?) cantid2,
					   CASE WHEN SUM(debe   - haber) < 0 THEN ROUND(SUM(haber  - debe),   ?)
					   	    ELSE 0
					    END haber,					    
					   CASE WHEN SUM(debe   - haber) > 0 THEN ROUND(SUM(debe   - haber),  ?)
					   	     ELSE 0
					    END debe,
					   CASE WHEN SUM(divdeb - divhab) < 0 THEN ROUND(SUM(divhab - divdeb), ?)
					   	    ELSE 0
					    END divhab,
					   CASE WHEN SUM(divdeb - divhab) > 0 THEN ROUND(SUM(divdeb - divhab), ?)
					   	    ELSE 0
					    END divdeb
				  FROM ${l_tmp_capuntes}
				 WHERE agrupa = 'S'
				   AND gencon = 'S'
				 GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ${SQL_grpOrden} 13, 14, 15, 16, 17, 18,
						  19, 20, 21, 22, 23, 24, 25
				 ORDER BY 12, 7, 8, 9, 10, 14
				`, m_loteid, m_asient, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred, tmp_capuntes.divred);
		}

		// ========================================================================
		// Ser final order column for capuntes
		// ========================================================================
		Ax.db.executeProcedure("capuntes_reorder", m_asient, tmp_capuntes.fecha, tmp_capuntes.empcode, 1);
	 
		// ========================================================================
		// Una vez generado todo el asiento, se verifica que este cuadrado.
		// Si la diferencia esta dentro de la tolerancia se modifica el útlimo
		// apunte para cuadrar el asiento.
		// ========================================================================
		var m_diff = Ax.db.executeProcedure("capuntes_debe_haber_cuadre", tmp_capuntes.empcode, tmp_capuntes.fecha, m_asient, 1).toOne();
		
		// Si se han encontrado diferencias intentamos ajustar tambien la diferencia en el ultimo registro de apuntes
		// en la tabla temporal por si hay costes a generar que cuadren con el importe generado
		if (m_diff.o_debehaber != 0 || m_diff.o_divdebdivhab != 0) {
			var sqlca = Ax.db.execute(`
			    UPDATE ${l_tmp_capuntes}
				   SET debe   = CASE WHEN debe   != 0 THEN debe   + NEGATE(?) ELSE 0 END,
					   haber  = CASE WHEN haber  != 0 THEN haber  + ?         ELSE 0 END,
					   divdeb = CASE WHEN divdeb != 0 THEN divdeb + NEGATE(?) ELSE 0 END,
					   divhab = CASE WHEN divhab != 0 THEN divhab + ?         ELSE 0 END
				 WHERE orden = (SELECT MAX(orden) FROM ${l_tmp_capuntes})                                       
				`, m_diff.o_debehaber, m_diff.o_debehaber, m_diff.o_divdebdivhab, m_diff.o_divdebdivhab);          
		}
		
		// ========================================================================
		// Ya tenemos todos los apuntes generados. Obtenemos información del asiento
		// ========================================================================
		var capuntesData = Ax.db.executeQuery(`SELECT MAX(apteid) apteid, MAX(asient) asient FROM capuntes WHERE loteid = ?`, m_loteid).toOne();
		
		// ========================================================================
		// CRP CUSTOM: Programación de apuntes.
		// ========================================================================
		var capuntesDataApteidMin = Ax.db.executeGet(`SELECT MIN(apteid) apteid FROM capuntes WHERE loteid = ? AND origen != 'N'`, m_loteid);
		Ax.db.executeProcedure("capuprog_genera", capuntesDataApteidMin);		

        // throw new Error('ID APUNTE  [' + capuntesDataApteidMin + ']');
		
		return {"loteid" : m_loteid, "apteid" : capuntesData.apteid, "asient" : capuntesData.asient, "divred" : tmp_capuntes.divred};
		
	}
	
	/**
	 * local_load_ccoscont
	 *
	 * Carga Costes
	 **************************************************************************/
	function local_load_ccoscont(l_tmp_capuntes, l_asient, l_divred) {
		var sqlca = Ax.db.execute(`
			INSERT INTO ccoscont(orden,   apteid,   fecha,    diario, empcode,
								 proyec,  seccio,   jusser,   docser, placon,
								 cuenta,  dimcode1, dimcode2, sistem, codcon,
								 concep,  ctaexp,   centro,   porcen,
								 cantid1, cantid2,  debe,     haber)
            SELECT 0,        c.apteid,   c.fecha,    c.diario, c.empcode,
				   c.proyec, c.seccio,   c.jusser,   c.docser, c.placon,
				   c.cuenta, c.dimcode1, c.dimcode2, c.sistem, c.codcon,
				   c.concep, t.ctaexp,   t.centro,
				   SUM(ABS(t.debe + t.haber)) / (SELECT ABS(cc.debe + cc.haber)
												   FROM capuntes cc
												  WHERE cc.apteid = c.apteid) * 100 porcen,
				   ROUND(SUM(t.cantid1), ?) cantid1,
				   ROUND(SUM(t.cantid2), ?) cantid2,
				   CASE WHEN SUM(t.debe - t.haber) > 0 THEN ROUND(SUM(t.debe  - t.haber), ?)
					    ELSE 0
					 END debe,
				   CASE WHEN SUM(t.debe - t.haber) < 0 THEN ROUND(SUM(t.haber - t.debe),  ?)
						ELSE 0
					END haber
              FROM capuntes c, ccuentas e, ${l_tmp_capuntes} t
			 WHERE c.placon = e.placon
			   AND c.cuenta = e.codigo
			   AND e.tipcta = 'C'
			   AND ((e.tipact IN ('D', 'A') AND c.debe  != 0) OR (e.tipact IN ('H', 'A') AND c.haber != 0))
			   AND e.activa  LIKE '%C%'
			   AND t.empcode = c.empcode
			   AND t.fecha   = c.fecha
			   AND t.diario  = c.diario
			   AND t.proyec  = c.proyec
			   AND t.seccio  = c.seccio
			   AND t.placon  = c.placon
			   AND t.cuenta  = c.cuenta
			   AND t.contra  = c.contra
			   AND t.sistem  = c.sistem
			   AND t.docser  = c.docser
			   AND NVL(t.dimcode1, 0) = c.dimcode1
			   AND NVL(t.dimcode2, 0) = c.dimcode2
			   AND NVL(t.codcon, '')  = NVL(c.codcon, '')
			   AND NVL(t.concep, '')  = NVL(c.concep, '')
			   AND t.agrupa = 'S'
			   AND t.ctaexp IS NOT NULL
			   AND t.centro IS NOT NULL
			   AND c.asient  = ?
			   AND c.debe + c.haber != 0
			   AND NOT EXISTS(SELECT ccoscont.apteid
							    FROM ccoscont
							   WHERE ccoscont.apteid = c.apteid)
			 GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18
		`, l_divred, l_divred, l_divred, l_divred, l_asient);
	}
	
	/**
	 * local_load_cpar_premovi
	 *
	 * Carga Partidas presupuestarias
	 **************************************************************************/
	function local_load_cpar_premovi(l_tmp_capuntes, l_tabname, l_asient) {
		var sqlca = Ax.db.execute(`
			INSERT INTO cpar_premovi(linid,  empcode, codpre, codpar, tabori, fecdoc,
									 feccon, docser,  tercer, codcon, concep,
									 apteid, import)
            SELECT 0,        t.empcode, t.codpre, t.codpar, CAST(? AS VARCHAR(40)), t.fecha,
				   t.fecha,  t.docser,  t.tercer, t.codcon, t.concep,
				   c.apteid, SUM(t.debe)
			  FROM capuntes c, ${l_tmp_capuntes} t
			 WHERE c.asient          = ?
			   AND t.empcode         = c.empcode
			   AND t.fecha           = c.fecha 
			   AND t.diario          = c.diario
			   AND t.docser          = c.docser
			   AND NVL(t.codcon, '') = NVL(c.codcon, '')
			   AND NVL(t.concep, '') = NVL(c.concep, '')
			   AND t.agrupa          = 'S'
			   AND t.codpre          IS NOT NULL
			 GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12`, l_tabname, l_asient);
	}
	
	/**
	 * local_load_ctax_move
	 *
	 * Carga Impuestos
	 **************************************************************************/
	function local_load_ctax_move(l_tmp_ctax_move_head, l_tmp_ctax_move_line, l_tabname, l_apteid, l_loteid, l_asient,  l_facidx) {
		var sqlca = Ax.db.execute(`
			INSERT INTO ctax_move_head( taxh_seqno,      taxh_apteid,  taxh_loteid,  taxh_natfac,     
										taxh_tipdoc,     taxh_fecha,   taxh_fecdoc,  taxh_fecope,     
										taxh_moneda,     taxh_cambio,  taxh_empcode, taxh_ciftyp_emp, 
										taxh_cifiss_emp, taxh_cifemp,  taxh_proyec,  taxh_seccio,     
										taxh_jusser,     taxh_docser,  taxh_refter,  taxh_docrec,     
										taxh_fecrec,     taxh_tercer,  taxh_tipdir,  taxh_nombre,     
										taxh_cifter,     taxh_ciftyp,  taxh_cifiss,  taxh_coda2,      
										taxh_codpos,     taxh_zondel,  taxh_zonter,  taxh_cnae,       
										taxh_key,        taxh_endnum,  taxh_taiter,  taxh_refext,     
										taxh_group,      taxh_import,  taxh_impdiv,  taxh_book)
			SELECT  0,                  CAST(? AS INTEGER), CAST(? AS INTEGER), taxh_natfac,     
					taxh_tipdoc,        taxh_fecha,    taxh_fecdoc,   taxh_fecope,     
					taxh_moneda,        taxh_cambio,   taxh_empcode,  taxh_ciftyp_emp, 
					taxh_cifiss_emp,    taxh_cifemp,   taxh_proyec,   taxh_seccio,     
					taxh_jusser,        taxh_docser,   taxh_refter,   taxh_docrec,     
					taxh_fecrec,        taxh_tercer,   taxh_tipdir,   taxh_nombre,     
					taxh_cifter,        taxh_ciftyp,   taxh_cifiss,   taxh_coda2,      
					taxh_codpos,        taxh_zondel,   taxh_zonter,   taxh_cnae,       
					taxh_key,           taxh_endnum,   taxh_taiter,   taxh_refext,     
					NVL(taxh_group, 0), taxh_import,   taxh_impdiv,   taxh_book
			  FROM ${l_tmp_ctax_move_head}
			 WHERE taxh_empcode IS NOT NULL`, l_apteid, l_loteid);

		let m_taxh_seqno = sqlca.getSerial();

		if (m_taxh_seqno != 0) {
			var sqlca = Ax.db.execute(`
				INSERT INTO ctax_move_line(taxl_seqno,      taxh_seqno,      taxl_aptdes,     taxl_type,
										   taxl_porcen,     taxl_porded,     taxl_porpro,     taxl_oper,
										   taxl_code,       taxl_basimp,     taxl_basnimp,    taxl_cuoded,
										   taxl_cuonded,    taxl_basimpdiv,  taxl_basnimpdiv, taxl_cuodeddiv,
										   taxl_cuondeddiv, taxl_desgen,     taxl_key,        taxl_nature,
										   taxl_valori,     taxl_valida,     taxl_rule,       taxl_telsend)
				SELECT  0,                 CAST(? AS INTEGER), NVL(c.apteid, 0),  t.taxl_type,
						t.taxl_porcen,     t.taxl_porded,    t.taxl_porpro,     t.taxl_oper,
						t.taxl_code,       t.taxl_basimp,    t.taxl_basnimp,    t.taxl_cuoded,
						NVL(t.taxl_cuonded, 0),    t.taxl_basimpdiv, t.taxl_basnimpdiv, t.taxl_cuodeddiv,
						NVL(t.taxl_cuondeddiv, 0), t.taxl_desgen,    t.taxl_key,        t.taxl_nature,
						t.taxl_valori,     t.taxl_valida,    t.taxl_rule,       t.taxl_telsend     
				  FROM ${l_tmp_ctax_move_line} t, ${l_tmp_ctax_move_head} u
						 LEFT OUTER JOIN capuntes c 
									  ON c.asient  = ?
									 AND c.empcode = u.taxh_empcode
									 AND c.fecha   = u.taxh_fecha
				 WHERE t.taxl_orden = c.orden
				   AND t.taxl_oper  IS NOT NULL
				   AND t.taxl_code  IS NOT NULL`, m_taxh_seqno, l_asient);
                      
			// ========================================================================
            // Enlazar el registro de recargo de equivalencia (taxl_type = 'E')
            // con el registro de tipo normal (taxl_type = 'N') asociado.
			// ========================================================================
			let rs_line = Ax.db.executeQuery(`
					SELECT taxl_seqno,
                            (SELECT MAX(b.taxl_seqno)
                               FROM ctax_move_line b, ctax_type
                              WHERE b.taxh_seqno        = ctax_move_line.taxh_seqno
                                AND b.taxl_type         = 'N'
                                AND b.taxl_code         = ctax_type.type_docori
                                AND ctax_type.type_code = ctax_move_line.taxl_code) taxl_linori
                     FROM ctax_move_line
                    WHERE taxh_seqno = ?
                      AND taxl_type  = 'E'
				`, m_taxh_seqno);
			for (let ctax_move_line of rs_line) {
				if (ctax_move_line.taxl_linori == null) {
					throw new Error('ID [' + l_facidx + ']: Línea de recargo de equivalencia ID [' + m_taxl_seqno + '] no enlazada con línea de impuesto normal');
				}
				Ax.db.update("ctax_move_line",
							 {"taxl_linori" : ctax_move_line.taxl_linori},
							 {"taxl_seqno"  : ctax_move_line.taxl_seqno}
							);
			}
		}

		// ========================================================================
		// Update table ctax_invoice_refcat
		// ========================================================================
		if (l_tabname.match(/(cvenfach|ccomfach)/)) {
			Ax.db.update("ctax_invoice_refcat",
					     {"taxh_seqno" : m_taxh_seqno },
					     {"facidx" : l_facidx }
					    );
		}
	}
	
	/**
	 * local_load_cefectos
	 *
	 * Carga Cartera
	 **************************************************************************/
	function local_load_cefectos(l_tmp_cefectos, l_tabname, l_apteid) {

		let nvl_clase = l_tabname == "ccomfach" ? "P" : "C";
		
		var sqlca = Ax.db.execute(`
			INSERT INTO cefectos( numero, apteid, tercer, cuenta, fecha,
								  fecven, jusser, docser, import, empcode,
								  proyec, seccio, tipefe, estado, codper,
								  numban, refban, ctafin, impiva, impret,
								  gastos, tipdoc, moneda, cambio, impdiv,
								  feccon, fecaux, agente, parest, numefe,
								  genpos,
								  caduca,
								  sistem,
								  clase)
			SELECT  0,        CAST(? AS INTEGER), t.tercer, t.cuenta, t.fecha,
					t.fecven, t.jusser, t.docser, t.import, t.empcode,
					t.proyec, t.seccio, t.tipefe, t.estado, t.codper,
					t.numban, t.refban, t.ctafin, t.impiva, t.impret,
					t.gastos, t.tipdoc, t.moneda, t.cambio, t.impdiv,
					t.feccon, t.fecaux, t.agente, t.parest, t.numefe,
					t.genpos,
					NVL(c.caduca, 'N') caduca,
					NVL(t.sistem, 'A') sistem,
					NVL(t.clase, "${nvl_clase}") clase
			  FROM ${l_tmp_cefectos} t
			  	   LEFT OUTER JOIN cefecest c 
							    ON t.estado = c.codigo
							   AND NVL(t.clase, "${nvl_clase}") = c.clase
             WHERE t.cuenta IS NOT NULL`, l_apteid);
    }
	
	/**************************************************************************/
	/** MAIN                                                                  */
	/**************************************************************************/
	var capuntes = {"loteid" : null, "apteid" : null, "asient" : null};
	
    if (p_tempTables.capuntes) {
		let md  = Ax.db.getMetaData().getTableMetaData(p_tempTables.capuntes, true);
		var mdc = md.getColumnNames();

    	capuntes = local_load_capuntes(p_tempTables.capuntes, p_tabname, mdc.contains("gencon"));
    }
    
	// ========================================================================
	// Carga costes
	// ========================================================================
    if (p_tempTables.capuntes && mdc.contains("ctaexp") && mdc.contains("centro")) {
    	local_load_ccoscont(p_tempTables.capuntes, capuntes.asient, capuntes.divred);
    }
    
	// ========================================================================
    // Carga partidas presupuestarias
	// ========================================================================
    if (p_tempTables.capuntes && mdc.contains("codpre") && mdc.contains("tercer")) {
    	local_load_cpar_premovi(p_tempTables.capuntes, p_tabname, capuntes.asient);
	}

	// ========================================================================
    // Carga impuestos
	// ========================================================================
    if (p_tempTables.ctax_move_head && p_tempTables.ctax_move_line && capuntes.apteid) {
    	local_load_ctax_move(p_tempTables.ctax_move_head, p_tempTables.ctax_move_line,
    					     p_tabname,  capuntes.apteid, capuntes.loteid, capuntes.asient, p_facidx);
    }
    
	// ========================================================================
    //  Carga efectos
	// ========================================================================
	if (p_tempTables.cefectos && capuntes.apteid) {
    	local_load_cefectos(p_tempTables.cefectos, p_tabname, capuntes.apteid);
	}
        
	if (p_regid != 0) {
		Ax.db.update("ccon_template_log",
					 {"loteid" : capuntes.loteid},
					 {"regid"  : p_regid}
					);
	}

    return capuntes.loteid;
}