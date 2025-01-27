var mStrTipo   = Ax.context.variable.TIPO_CONS;  // I: Informe, C: CSV
    let mCondInput = Ax.context.property.COND;
    var mEJEINI    = Ax.context.variable.EJEINI;
    var mEJEFIN    = Ax.context.variable.EJEFIN;
    var mPERINI    = Ax.context.variable.PERINI;
    var mPERFIN    = Ax.context.variable.PERFIN;
    var mFECHA_INI = new Ax.sql.Date(Ax.context.variable.FECHA_INI);
    var mFECHA_FIN = new Ax.sql.Date(Ax.context.variable.FECHA_FIN);
    
    var mSqlCond = `
            ${mCondInput}
        AND ctax_move_head.taxh_ejefis BETWEEN ${mEJEINI}    AND ${mEJEFIN} 
        AND ctax_move_head.taxh_perfis BETWEEN ${mPERINI}    AND ${mPERFIN} 
        AND ctax_move_head.taxh_fecha  BETWEEN ${Ax.db.toDateQuery(mFECHA_INI)} AND ${Ax.db.toDateQuery(mFECHA_FIN)}
    `;

    
    
    var mCondType = mSqlCond.indexOf("capuntes.") > -1 ? ``: `type="left"`;

    /**
     * Agrupado de secciones asignados a prorrata
     */
    // let mTmpProrrata = Ax.db.getTempTableName(`tmp_grp_ctax_prorrata`);
    // Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpProrrata}`);
    // Ax.db.execute(`
    //     <select intotemp='${mTmpProrrata}'>
    //         <columns>
    //             DISTINCT
    //             pror_empcode,
    //             pror_seccio
    //         </columns>
    //         <from table='ctax_prorrata' />
    //     </select>
    // `);
    
    /**
     * Agrupado de ctax_move_head para obtener la fecha de vencimientos de los
     * efectos y la fecha de pago de la tabla [ctax_detracciones] con el
     * número de constancia de la línea de detracción del documento fiscal
     */
    console.log("INICIO ", new Ax.util.Date())

    let mTmpCtaxHead= Ax.db.getTempTableName(`tmp_ctax_head`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpCtaxHead}`);
    Ax.db.execute(`
        <select intotemp='${mTmpCtaxHead}'>
            <columns>
                unique
                ctax_move_head.taxh_seqno,

                ctax_move_head.taxh_tercer,
                ctax_move_head.taxh_docrec,

                ctax_move_head.taxh_seccio,

                ctax_move_head.taxh_tipdoc ,

                ctax_move_head.taxh_loteid,
                ctax_move_head.taxh_apteid,

                ctax_move_head.taxh_auxfec2,
                ctax_move_head.taxh_natfac,
                ctax_move_head.taxh_ejefis,
                ctax_move_head.taxh_fecha,
                ctax_move_head.taxh_perfis,

                ctax_move_head.taxh_empcode,
                ctax_move_head.taxh_sistem,
                ctax_move_head.taxh_proyec,
                ctax_move_head.taxh_jusser,


                    taxh_auxchr4,
                    taxh_docser,
                    taxh_refter,
                    taxh_fecdoc,
                    taxh_fecope,
                    taxh_tipdir,
                    taxh_nombre,
                    taxh_cifter,
                    taxh_coda2,
                    taxh_codpos,
                    taxh_zondel,
                    taxh_zonter,
                    taxh_info,
                    taxh_moneda,
                    taxh_cambio,
                    ctax_move_head.user_created

            </columns>
            <from table='ctax_move_head'>
                <join table='ctax_move_line'>
                    <on>ctax_move_head.taxh_seqno   = ctax_move_line.taxh_seqno</on>
                </join>
            </from>
            <where>
                ${mSqlCond}
            </where>
        </select>
    `);

    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxHead}_1 ON ${mTmpCtaxHead} (taxh_seqno)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxHead}_2 ON ${mTmpCtaxHead} (taxh_tercer, taxh_docrec)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxHead}_3 ON ${mTmpCtaxHead} (taxh_seccio)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxHead}_4 ON ${mTmpCtaxHead} (taxh_tipdoc)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxHead}_5 ON ${mTmpCtaxHead} (taxh_loteid)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxHead}_6 ON ${mTmpCtaxHead} (taxh_apteid)`);
    
    /**
     * Condiciones de busqueda especial
    */
    mSqlCond_2 = mSqlCond.match(`ctax_move_head.taxh_natfac = 'V'`) ? `ctax_move_line.taxl_code NOT IN ('IGVS')` : '1=1';
        
    let mTmpCtaxLine= Ax.db.getTempTableName(`tmp_ctax_line`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpCtaxLine}`);
    Ax.db.execute(`
        <select intotemp='${mTmpCtaxLine}'>
            <columns>
                    ctax_move_line.taxh_seqno,

                ctax_move_line.taxl_basimp,
                ctax_move_line.taxl_cuoded,
                ctax_move_line.taxl_basnimp,
                ctax_move_line.taxl_cuonded,
                    ctax_move_line.taxl_oper,
                ctax_move_line.taxl_type,
                ctax_move_line.taxl_valida,
                ctax_move_line.taxl_porpro,
                ctax_move_line.taxl_porcen,
                ctax_move_line.taxl_code,
                ctax_move_line.taxl_basnimpdiv,
                ctax_move_line.taxl_basimpdiv,
                ctax_move_line.taxl_cuodeddiv,
                ctax_move_line.taxl_cuondeddiv,
                    ctax_move_line.taxl_rule,
                    ctax_move_line.taxl_aptdes,
                ctax_move_line.taxl_auxnum1

            </columns>
            <from table='${mTmpCtaxHead}' alias='ctax_move_head'>
                <join table='ctax_move_line'>
                    <on>ctax_move_head.taxh_seqno   = ctax_move_line.taxh_seqno</on>
                </join>
            </from>
            <where>
                ${mSqlCond_2}
            </where>
        </select>
    `);

    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxLine}_1 ON ${mTmpCtaxLine} (taxh_seqno)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxLine}_2 ON ${mTmpCtaxLine} (taxl_oper)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxLine}_3 ON ${mTmpCtaxLine} (taxl_rule)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxLine}_4 ON ${mTmpCtaxLine} (taxl_aptdes)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxLine}_5 ON ${mTmpCtaxLine} (taxl_valida)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxLine}_6 ON ${mTmpCtaxLine} (taxl_type)`);
    Ax.db.execute(`CREATE INDEX i_${mTmpCtaxLine}_7 ON ${mTmpCtaxLine} (taxl_code)`);
    
    let mTmpGrpCtaxDetEfec = Ax.db.getTempTableName(`tmp_grp_ctax_det_efec`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpGrpCtaxDetEfec}`);
    Ax.db.execute(`
        <union type='all' intotemp='${mTmpGrpCtaxDetEfec}'>
            <!-- CCOMFACH -->
            <select>
                <columns>
                    ctax_move_head.taxh_seqno,

                    MAX(CASE WHEN ctax_move_line.taxl_type  = 'D' THEN ctax_move_line.taxl_auxnum1
                        END) taxl_auxnum1,
                    MAX((SELECT MAX(fecpago)
                        FROM ctax_detracciones 
                        WHERE constancia = ctax_move_line.taxl_auxnum1
                            AND ctax_move_line.taxl_type  = 'D')) fecpago,
                    MAX(NVL(taxh_auxfec2, efecto_ccom.fecven))      fecven,
                    MIN(capuntes.asient)                            asient_det
                </columns>
                <from table='${mTmpCtaxHead}' alias='ctax_move_head'>
                    <join table='${mTmpCtaxLine}' alias='ctax_move_line'>
                        <on>ctax_move_head.taxh_seqno   = ctax_move_line.taxh_seqno</on>
                    </join>
                    <join table='capuntes' alias='apunte_ccom'>
                        <on>ctax_move_head.taxh_loteid = apunte_ccom.loteid</on>
                        <join table='cefectos' alias='efecto_ccom'>
                            <on>apunte_ccom.apteid = efecto_ccom.apteid</on>
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
                <group>
                    ctax_move_head.taxh_seqno
                </group>
            </select>
        </union>
    `);

    Ax.db.execute(`CREATE INDEX i_${mTmpGrpCtaxDetEfec} ON ${mTmpGrpCtaxDetEfec} (taxh_seqno)`);
    
    console.log("medio ", new Ax.util.Date())

    /**
     * LOCAL FUNCTION: __getRSCapuntes
     *
     * @param       {obj}           pObjParam		Objeto con parametros
     *                                             {limit}
     **/
    function __getRS (pObjParam){
        var rs = Ax.db.executeQuery(`
            <select>
                <columns>
                    ${pObjParam.limit}
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
                    MAX(ctax_move_head.taxh_tipdoc)                                                                    taxh_tipdoc,   <!-- Tipo de documento -->
                    MAX(CASE 
                            WHEN ctax_move_head.taxh_natfac = 'C' AND ctax_move_head.taxh_tipdoc NOT IN ('91', '97', '98') THEN '8.1'
                            WHEN ctax_move_head.taxh_natfac = 'C' AND ctax_move_head.taxh_tipdoc IN ('91', '97', '98') THEN '8.2'
                            ELSE ''
                    END)                                libro_ple,
                    MAX(pe_sunat_tab10.tipo_cdp_desc)                                                                tipo_cdp_desc, <!-- Descripción tipo documento -->
                    MAX(ctax_move_head.taxh_auxchr4)    tiposunat,
                    MAX(CASE 
                            WHEN INSTR(ctax_move_head.taxh_docser,'-',1) != 0 
                            THEN SUBSTRING_INDEX(ctax_move_head.taxh_docser, "-", 1) 
                            ELSE ''
                    END)                                serie,         <!-- Serie -->
                    MAX(CASE 
                            WHEN INSTR(ctax_move_head.taxh_docser,'-',1) != 0 
                            THEN SUBSTRING_INDEX(ctax_move_head.taxh_docser, "-", -1) 
                            ELSE ctax_move_head.taxh_docser
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
                            WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND capuntes.diario IN (25, 28, 29, 31, 32, 33)
                            THEN NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0)
                            WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND NOT EXISTS (SELECT pror_seccio FROM ctax_prorrata WHERE pror_empcode = ctax_move_head.taxh_empcode AND pror_seccio = ctax_move_head.taxh_seccio)
                            THEN NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0)
                            ELSE 0
                    END) column_a1,
                    
                    SUM(CASE
                            WHEN ctax_move_head.taxh_natfac = 'V' AND ctax_move_line.taxl_code IN ('IGVG', 'IGVH') 
                            THEN 0
                            WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND capuntes.diario IN (25, 28, 29, 31, 32, 33)
                            THEN 0
                            WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND EXISTS (SELECT pror_seccio FROM ctax_prorrata WHERE pror_empcode = ctax_move_head.taxh_empcode AND pror_seccio = ctax_move_head.taxh_seccio)
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
                            WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND capuntes.diario IN (25, 28, 29, 31, 32, 33)
                            THEN NVL(ctax_move_line.taxl_basimpdiv, 0) + NVL(ctax_move_line.taxl_basnimpdiv, 0)
                            WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND NOT EXISTS (SELECT pror_seccio FROM ctax_prorrata WHERE pror_empcode = ctax_move_head.taxh_empcode AND pror_seccio = ctax_move_head.taxh_seccio)
                            THEN NVL(ctax_move_line.taxl_basimpdiv, 0) + NVL(ctax_move_line.taxl_basnimpdiv, 0)
                            ELSE 0
                    END) column_a2,
                    
                    SUM(CASE
                            WHEN ctax_move_head.taxh_natfac = 'V' AND ctax_move_line.taxl_code IN ('IGVG', 'IGVH')
                            THEN 0
                            WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND capuntes.diario IN (25, 28, 29, 31, 32, 33)
                            THEN 0
                            WHEN ctax_move_line.taxl_code IN ('IGVG', 'IGVH', 'IGVS') AND EXISTS (SELECT pror_seccio FROM ctax_prorrata WHERE pror_empcode = ctax_move_head.taxh_empcode AND pror_seccio = ctax_move_head.taxh_seccio)
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
    
                    
                    MAX(grp_ctax_det_efec.fecpago)    fecpago,         <!-- Fecha de pago                       -->
    
                    SUM(ctax_move_line.taxl_cuodeddiv)  taxl_cuodeddiv,  <!-- Impuesto deducible, divisa          -->
                    MAX(ctax_rule.rule_keyart)          rule_keyart,     <!-- Clave artículo                      -->
                    MAX(ctax_artkey.artk_name)          artk_name,       <!-- Descripción de la clave de artículo -->
                    
                    <!-- Datos nota de crédito -->
                    MAX(ctax_move_recti.taxh_tipdoc)                              rect_tipdoc,
                    MAX(ctax_move_recti.taxh_docser)     taxh_docrec,    
                    MAX(CASE 
                            WHEN INSTR(ctax_move_recti.taxh_docser,'-',1) != 0 
                            THEN SUBSTRING_INDEX(ctax_move_recti.taxh_docser, "-", 1) 
                        ELSE ''
                    END) serierec,                                       <!-- Serie del documento rectificado -->
                    MAX(CASE 
                            WHEN INSTR(ctax_move_recti.taxh_docser,'-',1) != 0 
                            THEN SUBSTRING_INDEX(ctax_move_recti.taxh_docser, "-", -1) 
                        ELSE ctax_move_recti.taxh_docser
                    END) numerorec,                                      <!-- Numero del documento rectificado -->
                    MAX(ctax_move_recti.taxh_fecrec)     taxh_fecrec      <!-- Fecha de nota de crédito -->
                </columns>
                <from table='${mTmpCtaxHead}' alias='ctax_move_head'>
                    <join table='${mTmpCtaxLine}' alias='ctax_move_line'>
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
                            <on> '1'          = pe_sunat_padron_obliga_emie.pad_comprpag</on> <!-- 'FACTURA' -->
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
                    <join ${mCondType} table='capuntes'>
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
                    
                    <!-- Tabla temporal para la fecha de pago de la detracción,  -->
                    <!-- su asiento y fecha de vencimientos en cefectos          -->
                    <join type='left' table='${mTmpGrpCtaxDetEfec}' alias = 'grp_ctax_det_efec'>
                        <on>ctax_move_head.taxh_seqno = grp_ctax_det_efec.taxh_seqno</on>
                    </join>
                    <!-- Documento rectificado -->
                    <join type='left' table='ctax_move_head' alias = 'ctax_move_recti'>
                        <on>ctax_move_head.taxh_docrec = ctax_move_recti.taxh_docser</on>
                        <on>ctax_move_head.taxh_tercer = ctax_move_recti.taxh_tercer</on>
                        <on>ctax_move_recti.taxh_tipdoc != '07'</on>
                        <on>ctax_move_recti.taxh_tipdoc != '07'</on>
                        <on>
                            ctax_move_recti.taxh_seqno = (
                                SELECT MAX(recti.taxh_seqno)
                                  FROM ctax_move_head recti
                                 WHERE ctax_move_head.taxh_docrec = recti.taxh_docser AND 
                                       ctax_move_head.taxh_tercer = recti.taxh_tercer AND
                                       recti.taxh_tipdoc != '07'
                            )
                        </on>
                    </join>
                </from>
                <where>
                        ctax_move_line.taxl_code IN ('IGVG', 'IGVE', 'IGVX', 'IGVI', 'IGVH', 'IGVS', 'R4C', 'R4C0') 
                    AND ctax_move_line.taxl_type IN ('N', 'R')
                </where>
                <group>
                    taxh_seqno
                </group>
                <order>
                    taxh_fecha, taxh_fecdoc, fecven, ctax_move_head.taxh_seqno
                </order>
            </select>
        `).toMemory();
        
        return rs;
    }
    
    
    if(mStrTipo == 'I'){
        console.log("I INICIO ", new Ax.util.Date())

        var mRs = __getRS({
            limit: ''
        });
        mRs.close();

        console.log("I FIN ", new Ax.util.Date())

        return mRs;
    } else if(mStrTipo == 'C'){
    
        // ===============================================================
        // Definición ResultSet temporal
        // ===============================================================
        var mRsFile = new Ax.rs.Reader().memory(options => {
            options.setColumnNames(["nombre", "archivo"]);
            options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
        });
        
        var mIntNumReg = Ax.db.executeGet(`
            <select>
                <columns>
                    COUNT(*) cant
                </columns>
                <from table='ctax_move_head' />
                <where>
                        ctax_move_head.taxh_ejefis BETWEEN ${mEJEINI}    AND ${mEJEFIN} 
                    AND ctax_move_head.taxh_perfis BETWEEN ${mPERINI}    AND ${mPERFIN} 
                    AND ctax_move_head.taxh_fecha  BETWEEN ${mFECHA_INI} AND ${mFECHA_FIN}
                </where>
            </select>
        `);
        var mIntNumParts = 1;
        
        if (mIntNumReg % 1000000 == 0){
            mIntNumParts = (mIntNumReg / 1000000).toString();
            
        } else {
            mIntNumParts = Math.floor(mIntNumReg / 1000000) + 1;
            mIntNumParts = mIntNumParts.toString()
            
        }
        
        for(var i=0; i < mIntNumParts; i++){
            var mStrNameFile = 'comprobacion_reg_'+(i+1);
            var mRs = __getRS({
                limit: `SKIP ${1000000*i} FIRST 1000000`
            });
            
            var blob_pt2 = new Ax.sql.Blob(mStrNameFile+'.csv');

            new Ax.rs.Writer(mRs).csv(options => {
                options.setCharset('ISO-8859-1');
                options.withQuote('"');                 // Character used to quote fields
                options.withQuoteMode("NON_NUMERIC");   // Quote all non numeric fields: ALL, ALL_NON_NULL, MINIMAL, NON_NUMERIC, NONE

                options.setQuoteChar('"');
                options.setDelimiter("|");
                options.getFormats().setNumberFormat("numdec_es", "##.##", "es");

                options.setResource(blob_pt2);

                // Add a header for Excel to allow it recognises file as CSV
                options.setHeaderText("sep=" + options.getDelimiter());
            });
            mRs.close();

            // ===============================================================
            // Definición de file zip
            // ===============================================================
            var ficherozip_pt2 = new Ax.io.File("/tmp/"+mStrNameFile+".zip");
            var zip_pt2 = new Ax.util.zip.Zip(ficherozip_pt2);

            zip_pt2.zipFile(blob_pt2);
            zip_pt2.close();

            // ===============================================================
            // Definición blob del archivo zip
            // ===============================================================
            var dst_pt2 = new Ax.io.File(ficherozip_pt2.getAbsolutePath());
            var fichero_pt2 = new Ax.sql.Blob(dst_pt2);
            
            mRsFile.rows().add([mStrNameFile+'.csv', fichero_pt2.getBytes()]);
        }
        
        
        return mRsFile;
    }