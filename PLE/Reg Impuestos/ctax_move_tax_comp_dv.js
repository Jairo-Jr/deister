/**
 * Reporte: ctax_move_tax_comp_dv
 */

let mCondInput = Ax.context.property.COND;
    var mEJEINI    = Ax.context.variable.EJEINI;
    var mEJEFIN    = Ax.context.variable.EJEFIN;
    var mPERINI    = Ax.context.variable.PERINI;
    var mPERFIN    = Ax.context.variable.PERFIN;
    var mFECHA_INI = Ax.context.variable.FECHA_INI;
    var mFECHA_FIN = Ax.context.variable.FECHA_FIN;
    
    var mSqlCond = `
            ${mCondInput}
        AND ctax_move_head.taxh_ejefis BETWEEN ${mEJEINI}    AND ${mEJEFIN} 
        AND ctax_move_head.taxh_perfis BETWEEN ${mPERINI}    AND ${mPERFIN} 
        AND ctax_move_head.taxh_fecha  BETWEEN ${mFECHA_INI} AND ${mFECHA_FIN}
    `;

    if (mSqlCond.match(`ctax_move_head.taxh_natfac = 'V'`)) mSqlCond += ` AND ctax_move_line.taxl_code NOT IN ('IGVS')`;

    /**
     * Agrupado de secciones asignados a prorrata
     */
    let mTmpProrrata = Ax.db.getTempTableName(`tmp_grp_ctax_prorrata`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpProrrata}`);
    Ax.db.execute(`
        <select intotemp='${mTmpProrrata}'>
            <columns>
                DISTINCT
                pror_empcode,
                pror_seccio
            </columns>
            <from table='ctax_prorrata' />
        </select>
    `);
    
    /**
     * Agrupado de ctax_move_head para obtener la fecha de vencimientos de los
     * efectos y la fecha de pago de la tabla [ctax_detracciones] con el
     * número de constancia de la línea de detracción del documento fiscal
     */
    let mTmpGrpCtaxDetEfec = Ax.db.getTempTableName(`tmp_grp_ctax_det_efec`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpGrpCtaxDetEfec}`);
    Ax.db.execute(`
        <select intotemp='${mTmpGrpCtaxDetEfec}'>
            <columns>
                ctax_move_head.taxh_seqno,
                MAX(ctax_move_line.taxl_auxnum1)                                                taxl_auxnum1,
                MAX(ctax_detracciones.fecpago)                                                  fecpago,
        
                MAX(CASE WHEN NVL(taxh_auxfec2, '-1') != '-1' THEN taxh_auxfec2
                         WHEN NVL(efecto_ccom.fecven, '-1') != '-1' THEN efecto_ccom.fecven
                         WHEN NVL(efecto_cven.fecven, '-1') != '-1' THEN efecto_cven.fecven
                         WHEN NVL(efecto_gven.fecven, '-1') != '-1' THEN efecto_gven.fecven
                    END)                                                                        fecven,
                MIN(capuntes.asient)                                                            asient_det
            </columns>
            <from table='ctax_move_head'>
                <join type='left' table='ctax_move_line'>
                    <on>ctax_move_head.taxh_seqno = ctax_move_line.taxh_seqno</on>
                    <on>ctax_move_line.taxl_type  = 'D'</on>   <!-- Detracción -->
                    <join type='left' table='ctax_detracciones'>
                        <on>ctax_move_line.taxl_auxnum1 = ctax_detracciones.constancia</on>
                    </join>
                </join>
                
                
                <join type='left' table='ccomfach'>
                    <on>ctax_move_head.taxh_loteid = ccomfach.loteid</on>
                    <join type='left' table='capuntes' alias='apunte_ccom'>
                        <on>ccomfach.loteid = apunte_ccom.loteid</on>
                        <join type='left' table='cefectos' alias='efecto_ccom'>
                            <on>apunte_ccom.apteid = efecto_ccom.apteid</on>
                        </join>
                    </join>
                </join>
        
                <join type='left' table='cvenfach'>
                    <on>ctax_move_head.taxh_loteid = cvenfach.loteid</on>
                    <join type='left' table='capuntes' alias='apunte_cven'>
                        <on>cvenfach.loteid = apunte_cven.loteid</on>
                        <join type='left' table='cefectos' alias='efecto_cven'>
                            <on>apunte_cven.apteid = efecto_cven.apteid</on>
                        </join>
                    </join>
                </join>
        
                <join type='left' table='gcomfach'>
                    <on>ctax_move_head.taxh_loteid = gcomfach.loteid</on>
                    <join type='left' table='capuntes' alias='apunte_gcom'>
                        <on>gcomfach.loteid = apunte_gcom.loteid</on>
                        <join type='left' table='cefectos' alias='efecto_gcom'>
                            <on>apunte_gcom.apteid = efecto_gcom.apteid</on>
                        </join>
                    </join>
                </join>
        
                <join type='left' table='gvenfach'>
                    <on>ctax_move_head.taxh_loteid = gvenfach.loteid</on>
                    <join type='left' table='capuntes' alias='apunte_gven'>
                        <on>gvenfach.loteid = apunte_gven.loteid</on>
                        <join type='left' table='cefectos' alias='efecto_gven'>
                            <on>apunte_gven.apteid = efecto_gven.apteid</on>
                        </join>
                    </join>
                </join>
                
                <join type='left' table='cefectos'>
                    <on>ctax_move_head.taxh_apteid = cefectos.apteid</on>
                    <join table='ctipoefe'>
                        <on>cefectos.clase  = ctipoefe.clase </on>
                        <on>cefectos.tipefe = ctipoefe.codigo</on>
                        <on>ctipoefe.efactu = 21</on>          <!-- Detracción -->
                    </join>
                    <join type='left' table='cefecges_det'>
                        <on>cefectos.numero = cefecges_det.det_numero</on>
                        <join type='left' table='cefecges_pcs'>
                            <on>cefecges_det.pcs_seqno = cefecges_pcs.pcs_seqno</on>
                            <join table='capuntes'>
                                <on>cefecges_pcs.pcs_loteid = capuntes.loteid</on>
                            </join>
                        </join>
                    </join>
                </join>
                
            </from>
            <where>
                ${mSqlCond}
            </where>
            <group>
                ctax_move_head.taxh_seqno
            </group>
        </select>
    `);
  
    var rs = Ax.db.executeQuery(`
        <select>
            <columns>
                
                ctax_move_head.taxh_seqno,
                MAX(ctax_move_head.taxh_empcode)    taxh_empcode,   
                MAX(ctax_move_head.taxh_apteid)     taxh_apteid,    
                MAX(ctax_move_head.taxh_fecha)      taxh_fecha,  
                MAX(ctax_move_head.taxh_natfac)     taxh_natfac,    
                MAX(ctax_move_head.taxh_sistem)     taxh_sistem,
                MAX(CASE
                        WHEN ctax_move_head.taxh_tipdoc = '46' THEN capuntes_46.diario
                        ELSE capuntes.diario
                END)                                diario,
                MAX(CASE
                        WHEN ctax_move_head.taxh_tipdoc = '46' THEN capuntes_46.asient
                        ELSE capuntes.asient
                END)                                asient,
                MAX(ctax_move_head.taxh_proyec)     taxh_proyec,    
                MAX(ctax_move_head.taxh_seccio)     taxh_seccio,    
                MAX(cseccion.nomsec)                nomsec,
                MAX(ctax_move_head.taxh_jusser)     taxh_jusser,  
                MAX(ctax_move_head.taxh_tipdoc)     taxh_tipdoc,   <!-- Tipo de documento -->
                MAX(CASE 
                        WHEN ctax_move_head.taxh_natfac = 'C' AND ctax_move_head.taxh_tipdoc NOT IN ('91', '97', '98') THEN '8.1'
                        WHEN ctax_move_head.taxh_natfac = 'C' AND ctax_move_head.taxh_tipdoc IN ('91', '97', '98') THEN '8.2'
                        ELSE ''
                END)                                libro_ple,
                MAX(pe_sunat_tab10.tipo_cdp_desc)   tipo_cdp_desc, <!-- Descripción tipo documento -->
                MAX(ctax_move_head.taxh_auxchr4)    tiposunat,
                MAX(CASE 
                        WHEN INSTR(taxh_docser,'-',1) != 0 
                        THEN SUBSTRING_INDEX(taxh_docser, "-", 1) 
                        ELSE ''
                END)                                serie,         <!-- Serie -->
                MAX(CASE 
                        WHEN INSTR(taxh_docser,'-',1) != 0 
                        THEN SUBSTRING_INDEX(taxh_docser, "-", -1) 
                        ELSE taxh_docser
                END)                                numero,        <!-- Número -->
                MAX(ctax_move_head.taxh_docser)     taxh_docser,
                MAX(ctax_move_head.taxh_refter)     taxh_refter,   
                MAX(ctax_move_head.taxh_fecdoc)     taxh_fecdoc,    
                MAX(ctax_move_head.taxh_fecope)     taxh_fecope,
                MAX(NVL(grp_ctax_det_efec.fecven, gcomfach.auxnum5))       fecven,
                MAX(ctax_move_head.taxh_ejefis)     taxh_ejefis,
                MAX(ctax_move_head.taxh_perfis)     taxh_perfis,    
                MAX(ctax_move_head.taxh_tercer)     taxh_tercer,    
                MAX(ctax_move_head.taxh_tipdir)     taxh_tipdir,    
                MAX(ctax_move_head.taxh_nombre)     taxh_nombre,
                MAX(ctax_move_head.taxh_cifter)     taxh_cifter,    
                MAX(ctax_move_head.taxh_coda2)      taxh_coda2, 
                MAX(ctax_move_head.taxh_codpos)     taxh_codpos,    
                SUM (
                    NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0) +
                    NVL(ctax_move_line.taxl_cuoded, 0) + NVL(ctax_move_line.taxl_cuonded, 0)
                )                                   taxh_import,
                MAX(ctax_move_head.taxh_zondel)     taxh_zondel,    
                MAX(ctax_move_head.taxh_zonter)     taxh_zonter, 
                MAX(ctax_move_head.taxh_info)       taxh_info,      
                MAX(CASE
                        WHEN ctax_move_head.taxh_tipdoc = '46' THEN capuntes_46.concep
                        ELSE capuntes.concep
                END)                                glosadoc,
                MAX(ctax_move_line.taxl_oper)       taxl_oper,
                MAX(ctax_move_line.taxl_type)       taxl_type,      
                MAX(ctax_move_line.taxl_valida)     taxl_valida,
                MAX(ctax_move_line.taxl_porpro)     taxl_porpro,    
                MAX(ctax_move_line.taxl_porcen)     taxl_porcen,
                
                <!-- Importes en moneda local -->
                SUM(CASE
                        WHEN ctax_move_head.taxh_natfac = 'V' AND ctax_move_line.taxl_code IN ('IGVG', 'IGVH')
                        THEN NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0)
                        WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND grp_ctax_prorrata.pror_seccio IS NULL
                        THEN NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0)
                        ELSE 0
                END) column_a1,
                
                SUM(CASE
                        WHEN ctax_move_head.taxh_natfac = 'V' AND ctax_move_line.taxl_code IN ('IGVG', 'IGVH') 
                        THEN 0
                        WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND grp_ctax_prorrata.pror_seccio IS NOT NULL 
                        THEN NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0)
                        ELSE 0
                END) column_b1,
                
                SUM(CASE 
                        WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') 
                        THEN NVL(ctax_move_line.taxl_cuoded, 0) + NVL(ctax_move_line.taxl_cuonded, 0)
                        ELSE 0
                END) column_c1, 
                
                SUM(CASE 
                        WHEN ctax_move_line.taxl_code IN ('IGVE', 'IGVI', 'IGVX') 
                        THEN NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0)
                        ELSE 0
                END) column_d1,
                
                SUM(CASE 
                        WHEN ctax_move_line.taxl_code IN ('R4C', 'R4C0') 
                        THEN NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0)
                        ELSE 0
                END) column_e1,
                
                SUM(CASE 
                        WHEN ctax_move_line.taxl_code IN ('R4C', 'R4C0')  
                        THEN NVL(ctax_move_line.taxl_cuoded, 0) + NVL(ctax_move_line.taxl_cuonded, 0)
                        ELSE 0
                END) column_f1, 
                
                SUM (
                    NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0) +
                    NVL(ctax_move_line.taxl_cuoded, 0) + NVL(ctax_move_line.taxl_cuonded, 0)
                )   precio_1,
                
                MAX(ctax_move_head.taxh_moneda)     taxh_moneda,    
                MAX(ctax_move_head.taxh_cambio)     taxh_cambio,
                
                <!-- Importes en moneda del comprobante -->
                SUM(CASE
                        WHEN ctax_move_head.taxh_natfac = 'V' AND ctax_move_line.taxl_code IN ('IGVG', 'IGVH')
                        THEN NVL(ctax_move_line.taxl_basimpdiv, 0) + NVL(ctax_move_line.taxl_basnimpdiv, 0)
                        WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND grp_ctax_prorrata.pror_seccio IS NULL 
                        THEN NVL(ctax_move_line.taxl_basimpdiv, 0) + NVL(ctax_move_line.taxl_basnimpdiv, 0)
                        ELSE 0
                END) column_a2,
                
                SUM(CASE
                        WHEN ctax_move_head.taxh_natfac = 'V' AND ctax_move_line.taxl_code IN ('IGVG', 'IGVH')
                        THEN 0
                        WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND grp_ctax_prorrata.pror_seccio IS NOT NULL
                        THEN NVL(ctax_move_line.taxl_basimpdiv, 0) + NVL(ctax_move_line.taxl_basnimpdiv, 0)
                        ELSE 0
                END) column_b2,
                
                SUM(CASE 
                        WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') 
                        THEN NVL(ctax_move_line.taxl_cuodeddiv, 0) + NVL(ctax_move_line.taxl_cuondeddiv, 0)
                        ELSE 0
                END) column_c2, 
                
                SUM(CASE 
                        WHEN ctax_move_line.taxl_code IN ('IGVE', 'IGVI', 'IGVX') 
                        THEN NVL(ctax_move_line.taxl_basimpdiv, 0) + NVL(ctax_move_line.taxl_basnimpdiv, 0)
                        ELSE 0
                END) column_d2,
                
                SUM(CASE 
                        WHEN ctax_move_line.taxl_code IN ('R4C', 'R4C0') 
                        THEN NVL(ctax_move_line.taxl_basimpdiv, 0) + NVL(ctax_move_line.taxl_basnimpdiv, 0)
                        ELSE 0
                END) column_e2,
                
                SUM(CASE 
                        WHEN ctax_move_line.taxl_code IN ('R4C', 'R4C0')  
                        THEN NVL(ctax_move_line.taxl_cuodeddiv, 0) + NVL(ctax_move_line.taxl_cuondeddiv, 0)
                        ELSE 0
                END) column_f2, 
                
                SUM (
                    NVL(ctax_move_line.taxl_basimpdiv, 0) + NVL(ctax_move_line.taxl_basnimpdiv, 0) +
                    NVL(ctax_move_line.taxl_cuodeddiv, 0) + NVL(ctax_move_line.taxl_cuondeddiv, 0)
                )   precio_2,
                
                MAX(ctax_move_head.user_created)    user_created,
                
                MAX(CASE 
                        WHEN gcomfach.auxchr4 = '0' 
                        THEN '(SI)'
                        WHEN gcomfach.auxchr4 = '1' 
                        THEN '(NO)'
                END) estatus,
                MAX(ctercero_taxation.condic_contrib) condic_contrib,
                MAX(CASE 
                        WHEN pe_sunat_padron_obliga_emie.pad_descrpag = 'FACTURA' 
                        THEN pe_sunat_padron_obliga_emie.pad_ruc
                END) pad_ruc,
                MAX(CASE 
                        WHEN pe_sunat_padron_obliga_emie.pad_descrpag = 'FACTURA' 
                        THEN pe_sunat_padron_obliga_emie.pad_fecobl
                END) pad_fecobl,
                MAX(grp_ctax_det_efec.asient_det)   asient_det,      <!-- Asiento detracción                  -->
                MAX(grp_ctax_det_efec.taxl_auxnum1) taxl_auxnum1,    <!-- Numero de contancia                 -->
                MAX(grp_ctax_det_efec.fecpago)      fecpago,         <!-- Fecha de pago                       -->
                SUM(ctax_move_line.taxl_cuodeddiv)  taxl_cuodeddiv,  <!-- Impuesto deducible, divisa          -->
                MAX(ctax_rule.rule_keyart)          rule_keyart,     <!-- Clave artículo                      -->
                MAX(ctax_artkey.artk_name)          artk_name,       <!-- Descripción de la clave de artículo -->
                
                <!-- Datos nota de crédito -->
                MAX(
                CASE
                    WHEN ctax_move_head.taxh_tipdoc = '02'
                    THEN '02'   <!-- Honorarios -->
                    WHEN ctax_move_head.taxh_tipdoc != '02' AND SUBSTR(ctax_move_head.taxh_docrec, 1, 1) IN ('E', 'F') 
                    THEN '01'   <!-- Factura origen -->
                    WHEN ctax_move_head.taxh_tipdoc != '02' AND SUBSTR(ctax_move_head.taxh_docrec, 1, 1) = 'B' 
                    THEN '03'   <!-- Boleta origen  -->
                    ELSE ''
                END)                                rect_tipdoc,
                MAX(ctax_move_head.taxh_docrec)     taxh_docrec,    
                MAX(CASE 
                        WHEN INSTR(taxh_docrec,'-',1) != 0 
                        THEN SUBSTRING_INDEX(taxh_docrec, "-", 1) 
                    ELSE ''
                END) serierec,                                       <!-- Serie del documento rectificado -->
                MAX(CASE 
                        WHEN INSTR(taxh_docrec,'-',1) != 0 
                        THEN SUBSTRING_INDEX(taxh_docrec, "-", -1) 
                    ELSE taxh_docrec
                END) numerorec,                                      <!-- Numero del documento rectificado -->
                MAX(ctax_move_head.taxh_fecrec)     taxh_fecrec      <!-- Fecha de nota de crédito -->
            </columns>
            <from table='ctax_move_head'>
                <join table='ctax_move_line'>
                    <on>ctax_move_head.taxh_seqno   = ctax_move_line.taxh_seqno</on>
                    <on>ctax_move_line.taxl_valida != 2</on>
                    <join type='left' table='ctax_operation'>
                        <on>ctax_move_line.taxl_oper = ctax_operation.oper_code</on>
                    </join>
                    <join type='left' table='ctax_rule'>
                        <on>ctax_move_line.taxl_rule = ctax_rule.rule_seqno</on>
                        <join type='left' table='ctax_artkey'>
                            <on>ctax_rule.rule_keyart = ctax_artkey.artk_code</on>
                        </join>
                    </join>
                </join>
                <join type="left" table='ctercero' >
                    <on>ctax_move_head.taxh_tercer = ctercero.codigo</on>
                    <join type="left" table='pe_sunat_padron_obliga_emie' >
                        <on> ctercero.cif = pe_sunat_padron_obliga_emie.pad_ruc</on>
                        <on> 'FACTURA'    = pe_sunat_padron_obliga_emie.pad_descrpag</on>
                    </join>
                    <join type="left" table='ctercero_taxation' >
                        <on> ctercero.codigo =  ctercero_taxation.codigo</on>
                    </join>
                </join>
                <join type="left" table="cseccion">
                    <on>ctax_move_head.taxh_seccio = cseccion.codigo</on>
                </join>
                <join type="left" table="pe_sunat_tab10">
                    <on>ctax_move_head.taxh_tipdoc = pe_sunat_tab10.tipo_cdp_code</on>
                </join> 
                <join type="left" table='capuntes'>
                    <on>ctax_move_head.taxh_loteid = capuntes.loteid</on>
                    <on>ctax_move_head.taxh_apteid = capuntes.apteid</on>
                    <join type="left" table='gcomfach'>
                        <on>capuntes.loteid = gcomfach.loteid</on>
                    </join>
                </join>
                <join type="left" table='capuntes' alias='capuntes_46' >
                    <on>ctax_move_head.taxh_loteid = capuntes_46.loteid</on>
                    <on>ctax_move_line.taxl_aptdes = capuntes_46.apteid</on>
                </join>
                <!-- Tabla temporal para alinear el importe gravado por la   -->
                <!-- sección en la ctax_protarra                             -->
                <join type='left' table='${mTmpProrrata}' alias = 'grp_ctax_prorrata'>
                    <on>ctax_move_head.taxh_empcode = grp_ctax_prorrata.pror_empcode</on>
                    <on>ctax_move_head.taxh_seccio  = grp_ctax_prorrata.pror_seccio</on>
                </join>
                <!-- Tabla temporal para la fecha de pago de la detracción,  -->
                <!-- su asiento y fecha de vencimientos en cefectos          -->
                <join type='left' table='${mTmpGrpCtaxDetEfec}' alias = 'grp_ctax_det_efec'>
                    <on>ctax_move_head.taxh_seqno = grp_ctax_det_efec.taxh_seqno</on>
                </join>
            </from>
            <where>
                    ${mSqlCond}
                AND ctax_move_line.taxl_code IN ('IGVG', 'IGVE', 'IGVX', 'IGVI', 'IGVH', 'IGVS', 'R4C', 'R4C0') 
                AND ctax_move_line.taxl_type IN ('N', 'R')
            </where>
            <group>
                taxh_seqno
            </group>
            <order>
                taxh_fecha, taxh_fecdoc, fecven
            </order>
        </select>
    `);

    return rs;