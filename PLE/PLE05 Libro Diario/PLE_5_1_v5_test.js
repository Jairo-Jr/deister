/**
     * Name: pe_sunat_ple05_1_rep
     */
    
    // ===============================================================
    // Tipo de reporte y año/mes del periodo informado.
    // =============================================================== 
    var pStrCondicion   = 'I';
    var mIntYear        = parseInt(2024);
    var mIntMonth       = parseInt(5);
    
    var opcSQL = `capuntes.asient = 1274102`;
    // ===============================================================
    // Construcción de la primera y ultima fecha del mes,
    // correspondiente al periodo informado
    // ===============================================================
    if(pStrCondicion == 'I' || pStrCondicion == 'C') {
        var mDateTimeIniPeriodoInf = new Ax.util.Date('02-05-2024');
        var mDateTimeFinPeriodoInf = new Ax.util.Date('02-05-2024').addDay(1);
    } else {
        var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth, 1);
        var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth + 1, 1);
    }
    
    // ===============================================================
    // Concatenación del identificador del periodo para el
    // reporte de SUNAT
    // ===============================================================
    var mStrCodPeriodo = mIntYear.toString() + (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth) + '00';

    // ===============================================================
    // RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 5.1
    // ===============================================================
    /**
     * LOCAL FUNCTION: __getRSCapuntes
     *
     * @param       {obj}           pObjParam		Objeto con parametros
     *                                             {limit,
     *                                              periodo,
     *                                              cod_cta,
     *                                              tbl_tmp,
     *                                              tbl_tmp_2,
     *                                              tbl_tmp_3,
     *                                              tbl_tmp_4,
     *                                              fec_ini,
     *                                              fec_fin,
     *                                              columns,
     *                                              order_str}
     **/
    function __getRSCapuntes (pObjParam){
        var mRsCapuntes = Ax.db.executeQuery(`
            <select>
                <columns>
                    ${pObjParam.limit}
                    ${pObjParam.periodo}                                                                                                                    <alias name='period' />,            <!-- Campo 01 -->
                    LPAD(capuntes.asient,9,'0')||'.'||capuntes.orden                                                                                        <alias name='cuo' />,               <!-- Campo 02 -->
                    CASE WHEN capuntes.period = 0 AND capuntes.origen = 'A' THEN 'A'||LPAD(capuntes.asient,9,'0')
                            WHEN capuntes.period = 99 THEN 'C'||LPAD(capuntes.asient,9,'0')
                            ELSE 'M'||LPAD(capuntes.asient,9,'0')
                    END                                                                                                                                     <alias name='corr_asient' />,       <!-- Campo 03 -->
                    ${pObjParam.cod_cta}                                                                                                                    <alias name='cod_cuenta'/>,         <!-- Campo 04 -->
                    capuntes.proyec::CHAR(12)                                                                                                               <alias name='cod_operacion' />,     <!-- Campo 05 -->
                    capuntes.seccio::CHAR(12)                                                                                                               <alias name='cod_centro_costo' />,  <!-- Campo 06 -->
                    'PEN'                                                                                                                                   <alias name='moneda' />,            <!-- Campo 07 -->
                    CASE WHEN capuntes.origen = 'C' AND NVL(tmp_fach.ciftyp, '-1') != '-1' THEN tmp_fach.ciftyp
                        WHEN capuntes.origen = 'T' AND NVL(tmp_teso.ciftyp, '-1') != '-1' THEN tmp_teso.ciftyp
                        WHEN NVL(tmp_ctax_head.ciftyp, -1) IN (2,3) 
                                OR NVL(gcomfach.ciftyp, -1) IN (2,3)
                                OR NVL(cvenfach.ciftyp, -1) IN (2,3)
                                OR NVL(gvenfach.ciftyp, -1) IN (2,3) THEN '0'
                        WHEN NVL(tmp_ctax_head.ciftyp, -1) = 8 
                            OR NVL(gcomfach.ciftyp, -1) = 8
                            OR NVL(cvenfach.ciftyp, -1) = 8
                            OR NVL(gvenfach.ciftyp, -1) = 8 THEN 'A'
                        WHEN NVL(gcomfach.ciftyp, -1) != -1 THEN gcomfach.ciftyp::CHAR(1)
                        WHEN NVL(cvenfach.ciftyp, -1) != -1 THEN cvenfach.ciftyp::CHAR(1)
                        WHEN NVL(gvenfach.ciftyp, -1) != -1 THEN gvenfach.ciftyp::CHAR(1)
                        WHEN NVL(tmp_ctax_head.ciftyp, -1) != -1 THEN tmp_ctax_head.ciftyp::CHAR(1)
                        ELSE ''
                    END                                                                                                                                     <alias name='tip_doc_emisor' />,    <!-- Campo 08 -->
                    REPLACE(REPLACE(
                        CASE WHEN capuntes.origen = 'C' AND NVL(tmp_fach.cif, '-1') != '-1' THEN tmp_fach.cif
                            WHEN capuntes.origen = 'T' AND NVL(tmp_teso.cif, '-1') != '-1' THEN tmp_teso.cif
                            WHEN NVL(gcomfach.cif,'-1') != '-1' THEN gcomfach.cif
                            WHEN NVL(cvenfach.cif,'-1') != '-1' THEN cvenfach.cif
                            WHEN NVL(gvenfach.cif,'-1') != '-1' THEN gvenfach.cif
                            WHEN NVL(tmp_ctax_head.cifter, '-1') != '-1' THEN tmp_ctax_head.cifter
                            ELSE ''
                        END
                    , ' ', ''), '-', '')                                                                                                                    <alias name='num_doc_emisor' />,    <!-- Campo 09 -->
                    CASE WHEN capuntes.origen = 'C' AND NVL(tmp_fach.dockey, '-1') != '-1' THEN tmp_fach.dockey
                         WHEN capuntes.origen = 'T' AND NVL(tmp_teso.dockey, '-1') != '-1' THEN tmp_teso.dockey
                         WHEN NVL(NVL(tmp_ctax_head.tipdoc, tmp_capuntes.tipdoc), '00') = '99' 
                                OR NVL(gcomfach.dockey, '00') = '99'
                                OR NVL(cvenfach.dockey, '00') = '99'
                                OR NVL(gvenfach.dockey, '00') = '99' THEN '00'
                         WHEN NVL(gcomfach.dockey, '-1') != '-1' THEN gcomfach.dockey
                         WHEN NVL(cvenfach.dockey, '-1') != '-1' THEN cvenfach.dockey
                         WHEN NVL(gvenfach.dockey, '-1') != '-1' THEN gvenfach.dockey
                         WHEN NVL(NVL(tmp_ctax_head.tipdoc, tmp_capuntes.tipdoc), '-1') != '-1' THEN NVL(tmp_ctax_head.tipdoc, tmp_capuntes.tipdoc)
                         ELSE '00'
                    END                                                                                                                                     <alias name='tip_doc_pago' />,      <!-- Campo 10 -->
                    
                    REPLACE(TRIM(
                        CASE WHEN NVL(NVL(tmp_ctax_head.tipdoc, tmp_capuntes.tipdoc), '-1') = '46'
                                    OR NVL(gcomfach.dockey, '-1') = '46'
                                    OR NVL(cvenfach.dockey, '-1') = '46'
                                    OR NVL(gvenfach.dockey, '-1') = '46' THEN '0000'
                                WHEN NVL(NVL(tmp_ctax_head.tipdoc, tmp_capuntes.tipdoc), '-1') = '05'
                                    OR NVL(gcomfach.dockey, '-1') = '05'
                                    OR NVL(cvenfach.dockey, '-1') = '05'
                                    OR NVL(gvenfach.dockey, '-1') = '05' THEN '4'
                                WHEN NVL(gcomfach.refter, '-1') != '-1' 
                                    AND CHARINDEX('-', NVL(gcomfach.refter,'')) &gt; 0 THEN SUBSTRING_INDEX(gcomfach.refter, '-', 1)
                                WHEN NVL(cvenfach.docser, '-1') != '-1' 
                                    AND CHARINDEX('-', NVL(cvenfach.docser,'')) &gt; 0 THEN SUBSTRING_INDEX(cvenfach.docser, '-', 1)
                                WHEN NVL(gvenfach.docser, '-1') != '-1' 
                                    AND CHARINDEX('-', NVL(gvenfach.docser,'')) &gt; 0 THEN SUBSTRING_INDEX(gvenfach.docser, '-', 1)
                                WHEN NVL(capuntes.docser, '-1') != '-1' 
                                    AND CHARINDEX('-', NVL(capuntes.docser,'')) &gt; 0 THEN SUBSTRING_INDEX(capuntes.docser, '-', 1)
                                ELSE ''
                        END
                    ), '/', '')                                                                                                                             <alias name='num_serie' />,         <!-- Campo 11 -->

                    REPLACE(REPLACE(REPLACE(REPLACE(
                        CASE WHEN NVL(gcomfach.refter,'-1') != '-1'
                                    AND LENGTH(SUBSTRING_INDEX(NVL(gcomfach.refter,''), '-', -1)) &gt; 0 THEN SUBSTRING_INDEX(gcomfach.refter, '-', -1)
                                WHEN NVL(cvenfach.docser,'-1') != '-1'
                                    AND LENGTH(SUBSTRING_INDEX(NVL(cvenfach.docser,''), '-', -1)) &gt; 0 THEN SUBSTRING_INDEX(cvenfach.docser, '-', -1)
                                WHEN NVL(gvenfach.docser,'-1') != '-1'
                                    AND LENGTH(SUBSTRING_INDEX(NVL(gvenfach.docser,''), '-', -1)) &gt; 0 THEN SUBSTRING_INDEX(gvenfach.docser, '-', -1)
                                WHEN LENGTH(SUBSTRING_INDEX(capuntes.docser, '-', -1)) &gt; 0 THEN SUBSTRING_INDEX(capuntes.docser, '-', -1)
                                WHEN LENGTH(SUBSTRING_INDEX(capuntes.docser, '-', -1)) = 0 THEN '1'
                                ELSE capuntes.docser
                        END
                    , '/', ''), '*', ''), ' ', ''), '_', '')                                                                                                <alias name='num_correlativo' />,   <!-- Campo 12 -->
                    TO_CHAR(capuntes.fecha, '%d/%m/%Y')                                                                                                     <alias name='fecha_contable' />,    <!-- Campo 13 -->
                    TO_CHAR(CASE WHEN NVL(gcomfach.auxnum5, '-1') != '-1' THEN gcomfach.auxnum5
                                    WHEN NVL(tmp_capuntes.fecven, '-1') != '-1' THEN tmp_capuntes.fecven
                                    WHEN NVL(capuntes.fecval, '-1') != '-1' THEN capuntes.fecval
                                    ELSE ''::DATE
                            END
                    , '%d/%m/%Y')                                                                                                                           <alias name='fecha_vencimiento' />, <!-- Campo 14 -->
                    TO_CHAR(
                        CASE WHEN NVL(gcomfach.fecope, '-1') != '-1' THEN gcomfach.fecope
                                WHEN NVL(cvenfach.fecope, '-1') != '-1' THEN cvenfach.fecope
                                WHEN NVL(gvenfach.fecope, '-1') != '-1' THEN gvenfach.fecope
                                WHEN NVL(tmp_ctax_head.fecdoc, '-1') != '-1' THEN tmp_ctax_head.fecdoc
                                ELSE capuntes.fecha
                        END
                    , '%d/%m/%Y')                                                                                                                           <alias name='fecha_operacion' />,   <!-- Campo 15 -->
                    CAST(CASE WHEN NVL(capuntes.concep, '-1') = '-1' OR LENGTH(capuntes.concep) = 0 THEN 'NN '||capuntes.docser
                                ELSE REPLACE(capuntes.concep, '|', '')
                        END
                    AS VARCHAR(200))                                                                                                                        <alias name='glosa' />,             <!-- Campo 16 -->
                    ''                                                                                                                                      <alias name='glosa_referencial' />, <!-- Campo 17 -->
                    CAST(ROUND(capuntes.debe, 2) AS VARCHAR(15))                                                                                            <alias name='mov_debe' />,          <!-- Campo 18 -->
                    CAST(ROUND(capuntes.haber, 2) AS VARCHAR(15))                                                                                           <alias name='mov_haber' />,         <!-- Campo 19 -->
                    ''                                                                                                                                      <alias name='cod_libro' />,         <!-- Campo 20 -->
                    '1'                                                                                                                                     <alias name='estado_operacion' />,  <!-- Campo 21 -->
                    <whitespace/>
                    ${pObjParam.columns}
                </columns>
                <from table='capuntes'>
                    <join type='left' table='gcomfach'>
                        <on>gcomfach.loteid = capuntes.loteid</on>
                        <join type='left' table='ctercero' alias='gcom_tercer'>
                            <on>gcomfach.tercer = gcom_tercer.codigo</on>
                        </join>
                    </join>

                    <join type='left' table='cvenfach'>
                        <on>cvenfach.loteid = capuntes.loteid</on>
                        <join type='left' table='ctercero' alias='cven_tercer'>
                            <on>cvenfach.tercer = cven_tercer.codigo</on>
                        </join>
                    </join>

                    <join type='left' table='gvenfach'>
                        <on>gvenfach.loteid = capuntes.loteid</on>
                    </join>

                    <join type='left' table='${pObjParam.tbl_tmp}' alias='tmp_capuntes'>
                        <on>capuntes.apteid = tmp_capuntes.apteid</on>
                    </join>
                    <join type='left' table='${pObjParam.tbl_tmp_2}' alias='tmp_ctax_head'>
                        <on>capuntes.apteid = tmp_ctax_head.apteid</on>
                    </join>
                    <join type='left' table='${pObjParam.tbl_tmp_3}' alias='tmp_fach'>
                        <on>capuntes.apteid = tmp_fach.apteid</on>
                    </join>
                    <join type='left' table='${pObjParam.tbl_tmp_4}' alias='tmp_teso'>
                        <on>capuntes.apteid = tmp_teso.apteid</on>
                    </join>
                    <join type="left" table="cdiarios">
                        <on>capuntes.diario = cdiarios.codigo</on>
                    </join>
                    <join type="left" table="ccuentas">
                        <on>capuntes.placon = ccuentas.placon</on>
                        <on>capuntes.cuenta = ccuentas.codigo</on>
                    </join>
                    <join type="left" table="ccuentas" alias="ccuentas2">
                        <on>capuntes.placon = ccuentas2.placon</on>
                        <on>capuntes.contra = ccuentas2.codigo</on>
                    </join>
                </from>
                <where> 
                    capuntes.empcode = '125'
                    AND capuntes.sistem = 'A'
                    AND capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?

                    AND ${opcSQL}
                </where>
                ${pObjParam.order_str}
            </select>
        `, pObjParam.fec_ini, pObjParam.fec_fin).toMemory();

        return mRsCapuntes;
    }

    var mIntNumCapuntes = Ax.db.executeGet(`
        <select>
            <columns>
                COUNT(*) cant
            </columns>
            <from table='capuntes' />
            <where>
                capuntes.fecha &gt;= ?
                AND capuntes.fecha &lt; ?
                AND ${opcSQL}
            </where>
        </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

    // mObjCapuntes.apteid_medio = Math.floor((mObjCapuntes.apteid_min + mObjCapuntes.apteid_max)/2).toString();
    if (mIntNumCapuntes % 1000000 == 0){
        var mIntNumParts = (mIntNumCapuntes / 1000000).toString();
        
    } else {
        var mIntNumParts = Math.floor(mIntNumCapuntes / 1000000) + 1;
        mIntNumParts = mIntNumParts.toString()
        
    }


    // ===============================================================
    // TABLA TEMPORAL PARA CARTERA DE EFECTOS
    // ===============================================================
    let mTmpTableGrpCapuntes = Ax.db.getTempTableName(`tmp_tbl_cefectos`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableGrpCapuntes}`);

    Ax.db.execute(`
        <union intotemp = '${mTmpTableGrpCapuntes}'>
            <select>
                <columns>
                    capuntes.apteid,
                    cefectos.fecven,
                    cefectos.numero nro_efecto,
                    cefectos.tipdoc tipdoc
                </columns>
                <from table='capuntes'>
                    <lateral alias='cefectos'>
                        <select first = '1'>
                            <columns>
                                cefectos.fecven, 
                                cefectos.auxnum3 tipdoc,
                                cefectos.numero
                            </columns>
                            <from table='cefectos' />
                            <where>
                                cefectos.apteid = capuntes.apteid
                            </where>
                        </select>
                    </lateral>
                </from>
                <where>
                    capuntes.empcode = '125'
                    AND capuntes.sistem = 'A'
                    AND capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?
                    AND ${opcSQL}
                </where>
            </select>
            <select>
                <columns>
                    capuntes.apteid,
                    cefectos.fecven,
                    cefectos.numero nro_efecto,
                    cefectos.tipdoc tipdoc
                </columns>
                <from table='capuntes'>

                    <lateral alias='cefectos'>
                        <select first = '1'>
                            <columns>
                                cefectos.fecven, 
                                cefectos.auxnum3 tipdoc,
                                cefectos.numero
                            </columns>
                            <from table='cefecges_pcs'>
                                <join table='cefecges_det'>
                                    <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                                    <join table='cefectos'>
                                        <on>cefecges_det.det_numero = cefectos.numero</on>
                                    </join>
                                </join>
                            </from>
                            <where>
                                cefecges_pcs.pcs_loteid = capuntes.loteid
                            </where>
                        </select>
                    </lateral>
                </from>
                <where>
                    capuntes.empcode = '125'
                    AND capuntes.sistem = 'A'
                    AND capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?
                    AND ${opcSQL}
                </where>
            </select>
        </union>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);


    // ===============================================================
    // TABLA TEMPORAL PARA DOCUMENTOS FISCAL
    // ===============================================================
    let mTmpTableGrpCtaxHead = Ax.db.getTempTableName(`tmp_tbl_ctax_head`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableGrpCtaxHead}`);

    Ax.db.execute(`
        <union intotemp='${mTmpTableGrpCtaxHead}'>
            <select>
                <columns>
                    capuntes.apteid,
                    ctax_move_head.taxh_tipdoc tipdoc,
                    ctax_move_head.taxh_ciftyp ciftyp, 
                    ctax_move_head.taxh_cifter cifter,
                    ctax_move_head.taxh_fecdoc fecdoc
                </columns>
                <from table='capuntes'>
                    
                    <lateral alias='ctax_move_head'>
                        <select first = '1'>
                            <columns>
                                ctax_move_head.taxh_ciftyp, 
                                ctax_move_head.taxh_cifter,
                                ctax_move_head.taxh_tipdoc,
                                ctax_move_head.taxh_fecdoc
                            </columns>
                            <from table='ctax_move_head' />
                            <where>
                                ctax_move_head.taxh_apteid = capuntes.apteid
                            </where>
                        </select>
                    </lateral>
                </from>
                <where>
                    capuntes.empcode = '125'
                    AND capuntes.sistem = 'A'
                    AND capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?
                    AND ${opcSQL}
                </where>
            </select>

            <select>
                <columns>
                    capuntes.apteid,
                    ctax_move_head.taxh_tipdoc tipdoc,
                    ctax_move_head.taxh_ciftyp ciftyp, 
                    ctax_move_head.taxh_cifter cifter,
                    ctax_move_head.taxh_fecdoc fecdoc
                </columns>
                <from table='capuntes'>
                    
                    <lateral alias='ctax_move_head'>
                        <select first = '1'>
                            <columns>
                                ctax_move_head.taxh_ciftyp, 
                                ctax_move_head.taxh_cifter,
                                ctax_move_head.taxh_tipdoc,
                                ctax_move_head.taxh_fecdoc
                            </columns>
                            <from table='ctax_move_head' />
                            <where>
                                ctax_move_head.taxh_loteid = capuntes.loteid
                            </where>
                        </select>
                    </lateral>
                </from>
                <where>
                    capuntes.empcode = '125'
                    AND capuntes.sistem = 'A'
                    AND capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?
                    AND ${opcSQL}
                </where>
            </select>
        </union>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

    // ===============================================================
    // TABLA TEMPORAL PARA FACTURAS (APUNTES CON ORIGEN CARTERA -C-)
    // ===============================================================
    let mTmpTableGrpFactura = Ax.db.getTempTableName(`tmp_tbl_comven_fach`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableGrpFactura}`);

    Ax.db.execute(`
        <select intotemp='${mTmpTableGrpFactura}'>
            <columns>
                capuntes.apteid,
                cefecges_pcs.ciftyp,
                cefecges_pcs.cif,
                cefecges_pcs.dockey
            </columns>
            <from table='capuntes'>
                <lateral alias='cefecges_pcs'>
                    <select first='1'>
                        <columns>
                            CASE WHEN NVL(ccomfach.ciftyp, '-1')::CHAR(2) != '-1' THEN ccomfach.ciftyp::CHAR(2)
                                WHEN NVL(gcomfach.ciftyp, '-1')::CHAR(2) != '-1' THEN gcomfach.ciftyp::CHAR(2)
                                WHEN NVL(cvenfach.ciftyp, '-1')::CHAR(2) != '-1' THEN cvenfach.ciftyp::CHAR(2)
                                WHEN NVL(gvenfach.ciftyp, '-1')::CHAR(2) != '-1' THEN gvenfach.ciftyp::CHAR(2)
                                ELSE ''
                            END ciftyp,
                            CASE WHEN NVL(ccomfach.cif, '-1') != '-1' THEN ccomfach.cif
                                WHEN NVL(gcomfach.cif, '-1') != '-1' THEN gcomfach.cif
                                WHEN NVL(cvenfach.cif, '-1') != '-1' THEN cvenfach.cif
                                WHEN NVL(gvenfach.cif, '-1') != '-1' THEN gvenfach.cif
                                ELSE ''
                            END cif,
                            CASE WHEN NVL(ccomfach.dockey, '-1') != '-1' THEN ccomfach.dockey
                                WHEN NVL(gcomfach.dockey, '-1') != '-1' THEN gcomfach.dockey
                                WHEN NVL(cvenfach.dockey, '-1') != '-1' THEN cvenfach.dockey
                                WHEN NVL(gvenfach.dockey, '-1') != '-1' THEN gvenfach.dockey
                                WHEN NVL(cefectos.auxnum3, '-1') != '-1' THEN cefectos.auxnum3
                                ELSE ''
                            END dockey
                        </columns>
                        <from table='cefecges_pcs'>
                            <join table='cefecges_det'>
                                <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                                <join table='cefectos'>
                                    <on>cefecges_det.det_numero = cefectos.numero</on>
                                    <on>capuntes.docser = cefectos.docser</on>
                                    <join type='left' table='ccomfach'>
                                        <on>cefectos.jusser = ccomfach.docser</on>
                                        <on>cefectos.tercer = ccomfach.tercer</on>
                                    </join>
                                    <join type='left' table='gcomfach'>
                                        <on>cefectos.docser = gcomfach.refter</on>
                                        <on>cefectos.codper = gcomfach.tercer</on>
                                    </join>
                                    <join type='left' table='cvenfach'>
                                        <on>cefectos.docser = cvenfach.docser</on>
                                    </join>
                                    <join type='left' table='gvenfach'>
                                        <on>cefectos.docser = gvenfach.docser</on>
                                    </join>
                                </join>
                            </join>
                        </from>
                        <where>
                            cefecges_pcs.pcs_loteid = capuntes.loteid
                        </where>
                    </select>
                </lateral>
            </from>
            <where>
                capuntes.empcode = '125'
                AND capuntes.sistem = 'A'

                AND capuntes.origen = 'C'
                AND capuntes.fecha &gt;= ?
                AND capuntes.fecha &lt; ?
                AND ${opcSQL}
            </where>
        </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

    // ===============================================================
    // TABLA TEMPORAL PARA MOV. TESORERIA (APUNTES CON ORIGEN TESORERIA -T-)
    // ===============================================================
    let mTmpTableGrpMovTesoreria = Ax.db.getTempTableName(`tmp_tbl_comven_fach`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableGrpMovTesoreria}`);

    Ax.db.execute(`
        <union intotemp='${mTmpTableGrpMovTesoreria}'>
            <select>
                <columns>
                    capuntes.apteid,
                    taptcuen.ciftyp,
                    taptcuen.cif,
                    taptcuen.dockey
                </columns>
                <from table='capuntes'>
                    <lateral alias='taptcuen'>
                        <select first='1'>
                            <columns>
                                CASE WHEN NVL(ccomfach.ciftyp, '-1')::CHAR(2) != '-1' THEN ccomfach.ciftyp::CHAR(2)
                                    WHEN NVL(gcomfach.ciftyp, '-1')::CHAR(2) != '-1' THEN gcomfach.ciftyp::CHAR(2)
                                    WHEN NVL(cvenfach.ciftyp, '-1')::CHAR(2) != '-1' THEN cvenfach.ciftyp::CHAR(2)
                                    WHEN NVL(gvenfach.ciftyp, '-1')::CHAR(2) != '-1' THEN gvenfach.ciftyp::CHAR(2)
                                    ELSE ''
                                END ciftyp,
                                CASE WHEN NVL(ccomfach.cif, '-1') != '-1' THEN ccomfach.cif
                                    WHEN NVL(gcomfach.cif, '-1') != '-1' THEN gcomfach.cif
                                    WHEN NVL(cvenfach.cif, '-1') != '-1' THEN cvenfach.cif
                                    WHEN NVL(gvenfach.cif, '-1') != '-1' THEN gvenfach.cif
                                    ELSE ''
                                END cif,
                                CASE WHEN NVL(ccomfach.dockey, '-1') != '-1' THEN ccomfach.dockey
                                    WHEN NVL(gcomfach.dockey, '-1') != '-1' THEN gcomfach.dockey
                                    WHEN NVL(cvenfach.dockey, '-1') != '-1' THEN cvenfach.dockey
                                    WHEN NVL(gvenfach.dockey, '-1') != '-1' THEN gvenfach.dockey
                                    WHEN NVL(cefectos.auxnum3, '-1') != '-1' THEN cefectos.auxnum3
                                    ELSE ''
                                END dockey
                            </columns>
                            <from table='taptcuen'>
                                <join table='taptfluj'>
                                    <on>taptcuen.apteid = taptfluj.rowenl</on>

                                    <join table='cefectos'>
                                        <on>taptfluj.numero = cefectos.numero</on>
                                        <on>capuntes.docser = cefectos.docser</on>
                                        <join type='left' table='ccomfach'>
                                            <on>cefectos.jusser = ccomfach.docser</on>
                                            <on>cefectos.tercer = ccomfach.tercer</on>
                                        </join>
                                        <join type='left' table='gcomfach'>
                                            <on>cefectos.docser = gcomfach.refter</on>
                                            <on>cefectos.codper = gcomfach.tercer</on>
                                        </join>
                                        <join type='left' table='cvenfach'>
                                            <on>cefectos.docser = cvenfach.docser</on>
                                        </join>
                                        <join type='left' table='gvenfach'>
                                            <on>cefectos.docser = gvenfach.docser</on>
                                        </join>
                                    </join>
                                </join>
                            </from>
                            <where>
                                taptcuen.loteid = capuntes.loteid
                            </where>
                        </select>
                    </lateral>
                </from>
                <where>
                    capuntes.empcode = '125'
                    AND capuntes.sistem = 'A'

                    AND capuntes.origen = 'T'
                    AND capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?
                    AND ${opcSQL}
                </where>
            </select>
            <select>
                <columns>
                    capuntes.apteid,
                    taptcuen.ciftyp,
                    taptcuen.cif,
                    taptcuen.dockey
                </columns>
                <from table='capuntes'>
                    <lateral alias='taptcuen'>
                        <select first='1'>
                            <columns>
                                CASE WHEN NVL(ccomfach.ciftyp, '-1')::CHAR(2) != '-1' THEN ccomfach.ciftyp::CHAR(2)
                                    WHEN NVL(gcomfach.ciftyp, '-1')::CHAR(2) != '-1' THEN gcomfach.ciftyp::CHAR(2)
                                    WHEN NVL(cvenfach.ciftyp, '-1')::CHAR(2) != '-1' THEN cvenfach.ciftyp::CHAR(2)
                                    WHEN NVL(gvenfach.ciftyp, '-1')::CHAR(2) != '-1' THEN gvenfach.ciftyp::CHAR(2)
                                    ELSE ''
                                END ciftyp,
                                CASE WHEN NVL(ccomfach.cif, '-1') != '-1' THEN ccomfach.cif
                                    WHEN NVL(gcomfach.cif, '-1') != '-1' THEN gcomfach.cif
                                    WHEN NVL(cvenfach.cif, '-1') != '-1' THEN cvenfach.cif
                                    WHEN NVL(gvenfach.cif, '-1') != '-1' THEN gvenfach.cif
                                    ELSE ''
                                END cif,
                                CASE WHEN NVL(ccomfach.dockey, '-1') != '-1' THEN ccomfach.dockey
                                    WHEN NVL(gcomfach.dockey, '-1') != '-1' THEN gcomfach.dockey
                                    WHEN NVL(cvenfach.dockey, '-1') != '-1' THEN cvenfach.dockey
                                    WHEN NVL(gvenfach.dockey, '-1') != '-1' THEN gvenfach.dockey
                                    WHEN NVL(cefectos.auxnum3, '-1') != '-1' THEN cefectos.auxnum3
                                    ELSE ''
                                END dockey
                            </columns>
                            <from table='taptcuen'>
                                <join table='taptfluj'>
                                    <on>taptcuen.apteid = taptfluj.rowenl</on>

                                    <join table='cefectos'>
                                        <on>taptfluj.numero = cefectos.numero</on>
                                        <on>capuntes.docser = cefectos.docser</on>
                                        <join type='left' table='ccomfach'>
                                            <on>cefectos.jusser = ccomfach.docser</on>
                                            <on>cefectos.tercer = ccomfach.tercer</on>
                                        </join>
                                        <join type='left' table='gcomfach'>
                                            <on>cefectos.docser = gcomfach.refter</on>
                                            <on>cefectos.codper = gcomfach.tercer</on>
                                        </join>
                                        <join type='left' table='cvenfach'>
                                            <on>cefectos.docser = cvenfach.docser</on>
                                        </join>
                                        <join type='left' table='gvenfach'>
                                            <on>cefectos.docser = gvenfach.docser</on>
                                        </join>
                                    </join>
                                </join>
                            </from>
                            <where>
                                taptcuen.rowenl = capuntes.apteid
                            </where>
                        </select>
                    </lateral>
                </from>
                <where>
                    capuntes.empcode = '125'
                    AND capuntes.sistem = 'A'

                    AND capuntes.origen = 'T'
                    AND capuntes.fecha &gt;= ?
                    AND capuntes.fecha &lt; ?
                    AND ${opcSQL}
                </where>
            </select>
        </union>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

    // ===============================================================
    // Arreglo de códigos de cuentas que presentan error
    // de estructura:
    //  * campo10: tipo de comprobante de pago
    //  * campo12: número de comprobante de pago
    //  * campo15: fecha de la operación
    //  * campo16: glosa/descripción de la operación
    // ===============================================================
    var mArrayCodCtaError = [];

    var mIntContador = 0;
    var mNumCta = '';

    // ===============================================================
    // Recorrido de registros para validar la existencia de campos
    // requeridos para la estructura de SUNAT.
    // ===============================================================
    /*for(let mObjRegistro of mRsPle_5_1) {

        // ===============================================================
        // Limite de 20 registros como máximo para informar
        // registros erróneos, limitante de cantidad de
        // caracteres por el frontal
        // ===============================================================
        if(mIntContador < 20){

            // ===============================================================
            // Construcción de la estructura del código de cuenta
            // ===============================================================
            mNumCta = (mObjRegistro.campo4.length > 9) ? mObjRegistro.campo4.substr(0, 9)+ '.' + mObjRegistro.campo4.substr(9) : mObjRegistro.campo4;

            // ===============================================================
            // Si algún campo requerido es null, se registra el numero
            // de cuenta en el arreglo definido.
            // ===============================================================
            if (!mObjRegistro.campo10 || !mObjRegistro.campo12 || !mObjRegistro.campo15 || !mObjRegistro.campo16) {
                mArrayCodCtaError.push(mNumCta);
            }
            mIntContador++;
        } else {
            break;
        }
    }*/

    // ===============================================================
    // Variables para el nombre del archivo
    // ===============================================================
    var mStrRuc             = '20100121809';
    var mStrYear            = mIntYear;
    var mStrMonth           = mIntMonth < 10 ? '0'+mIntMonth : mIntMonth;
    var mIntIndOperacion    = 1;
    var mIntContLibro       = 1;
    var mIntMoneda          = 1;

    // ===============================================================
    // Estructura de nombre del archivo .txt de salida:
    // LERRRRRRRRRRRAAAAMM0005010000OIM1.txt
    // ===============================================================
    var mStrFileName = 'LE' + mStrRuc + mStrYear + mStrMonth + '0005010000'+ mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

    // ===============================================================
    // Si la condición del reporte es Fichero (F)
    // .txt para declaración a SUNAT
    // ===============================================================
    if(pStrCondicion == 'F') {

        var mRsPle_5_1 = __getRSCapuntes({
            limit: '',
            periodo: mStrCodPeriodo,
            cod_cta: `REPLACE(capuntes.cuenta, '.', '')::CHAR(18)`,
            tbl_tmp: mTmpTableGrpCapuntes,
            tbl_tmp_2: mTmpTableGrpCtaxHead,
            tbl_tmp_3: mTmpTableGrpFactura,
            tbl_tmp_4: mTmpTableGrpMovTesoreria,
            fec_ini: mDateTimeIniPeriodoInf,
            fec_fin: mDateTimeFinPeriodoInf,
            columns: '',
            order_str: '<order>capuntes.fecha,capuntes.asient,capuntes.orden,capuntes.apteid</order>'
        });

        // ===============================================================
        // Si existen números de cuenta registrados en el arreglo
        // se lanza una excepción que informa corregir campos
        // faltantes del registro
        // ===============================================================
        /*if (mArrayCodCtaError.length > 0) {
            throw new Ax.ext.Exception(`El/los códigos de cuenta de capuntes, deben ser corregidos los tipo/número comprobante de pago, fecha de operación y descripcion: [${mArrayCodCtaError},...]`);
        }*/

        // ===============================================================
        // Definición del blob
        // ===============================================================
        var blob = new Ax.sql.Blob(mStrFileName);

        // ===============================================================
        // Definición del archivo txt
        // ===============================================================
        new Ax.rs.Writer(mRsPle_5_1).csv(options => {
            options.setHeader(false);
            options.setDelimiter("|");
            options.setResource(blob);
        });
        mRsPle_5_1.close();

        // ===============================================================
        // Definición de file zip
        // ===============================================================
        var ficherozip = new Ax.io.File("/tmp/ziptest.zip");
        var zip = new Ax.util.zip.Zip(ficherozip);

        zip.zipFile(blob);
        zip.close();

        // ===============================================================
        // Definición blob del archivo zip
        // ===============================================================
        var dst = new Ax.io.File(ficherozip.getAbsolutePath());
        var fichero = new Ax.sql.Blob(dst);

        // ===============================================================
        // Definición ResultSet temporal
        // ===============================================================
        var mRsFile = new Ax.rs.Reader().memory(options => {
            options.setColumnNames(["nombre", "archivo"]);
            options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
        });
        mRsFile.rows().add([mStrFileName, fichero.getBytes()]);

        return mRsFile;

        // ===============================================================
        // Si la condición del reporte es CSV (C)
        // ===============================================================
    } else if(pStrCondicion == 'C') {

        // ===============================================================
        // Definición ResultSet temporal
        // ===============================================================
        var mRsFile = new Ax.rs.Reader().memory(options => {
            options.setColumnNames(["nombre", "archivo"]);
            options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
        });

        /**
         * ARCHIVO CSV PARTE 1
         */
        var mStrNameFile = 'ple_0501_'+mIntYear+'_'+mIntMonth+'_part1';
        var mRsPle_5_1_pt1 = __getRSCapuntes({
            limit: 'FIRST 1000000',
            periodo: mStrCodPeriodo,
            cod_cta: `"'"||capuntes.cuenta::CHAR(18)`,
            tbl_tmp: mTmpTableGrpCapuntes,
            tbl_tmp_2: mTmpTableGrpCtaxHead,
            tbl_tmp_3: mTmpTableGrpFactura,
            tbl_tmp_4: mTmpTableGrpMovTesoreria,
            fec_ini: mDateTimeIniPeriodoInf,
            fec_fin: mDateTimeFinPeriodoInf,
            columns: `,capuntes.diario,cdiarios.nomdia,
                        CASE WHEN capuntes.cuenta LIKE '9%' THEN capuntes.contra END contra,
                        CASE WHEN capuntes.cuenta LIKE '9%' THEN ccuentas2.nombre END nomtra,
                        CASE WHEN NVL(gcom_tercer.nombre, '-1') != '-1' THEN gcom_tercer.nombre
                            WHEN NVL(cven_tercer.NOMBRE, '-1') != '-1' THEN cven_tercer.nombre
                            ELSE ''
                        END nombre2,
                        CASE WHEN NVL(gcomfach.tercer, '-1') != '-1' THEN gcomfach.tercer
                            WHEN NVL(cvenfach.tercer, '-1') != '-1' THEN cvenfach.tercer
                            ELSE ''
                        END tercer,
                        ccuentas.nombre nombre_cta,
                        capuntes.user_created,capuntes.date_created,
                        capuntes.user_updated,capuntes.date_updated,
                        capuntes.apteid,capuntes.loteid,tmp_capuntes.nro_efecto`,
            order_str: '<order>capuntes.fecha,capuntes.asient,capuntes.orden,capuntes.apteid</order>'
        });

        var blob_pt1 = new Ax.sql.Blob(mStrNameFile+'.csv');

        new Ax.rs.Writer(mRsPle_5_1_pt1).csv(options => {
            options.setCharset('ISO-8859-1');
            options.withQuote('"');                 // Character used to quote fields
            options.withQuoteMode("NON_NUMERIC");   // Quote all non numeric fields: ALL, ALL_NON_NULL, MINIMAL, NON_NUMERIC, NONE

            options.setQuoteChar('"');
            options.setDelimiter("|");
            options.getFormats().setNumberFormat("numdec_es", "##.##", "es");

            options.setResource(blob_pt1);

            // Add a header for Excel to allow it recognises file as CSV
            options.setHeaderText("sep=" + options.getDelimiter());
        });
        mRsPle_5_1_pt1.close();

        // ===============================================================
        // Definición de file zip
        // ===============================================================
        var ficherozip_pt1 = new Ax.io.File("/tmp/"+mStrNameFile+".zip");
        var zip_pt1 = new Ax.util.zip.Zip(ficherozip_pt1);

        zip_pt1.zipFile(blob_pt1);
        zip_pt1.close();

        // ===============================================================
        // Definición blob del archivo zip
        // ===============================================================
        var dst_pt1 = new Ax.io.File(ficherozip_pt1.getAbsolutePath());
        var fichero_pt1 = new Ax.sql.Blob(dst_pt1);

        mRsFile.rows().add([mStrNameFile+'.zip', fichero_pt1.getBytes()]);

        for(var i=1; i < mIntNumParts; i++){
            /**
             * ARCHIVO CSV PARTE 2
             */
            var mStrNameFile = 'ple_0501_'+mIntYear+'_'+mIntMonth+'_part'+(i+1);
            var mRsPle_5_1_pt2 = __getRSCapuntes({
                limit: `SKIP ${1000000*i} FIRST 1000000`,
                periodo: mStrCodPeriodo,
                cod_cta: `"'"||capuntes.cuenta::CHAR(18)`,
                tbl_tmp: mTmpTableGrpCapuntes,
                tbl_tmp_2: mTmpTableGrpCtaxHead,
                tbl_tmp_3: mTmpTableGrpFactura,
                tbl_tmp_4: mTmpTableGrpMovTesoreria,
                fec_ini: mDateTimeIniPeriodoInf,
                fec_fin: mDateTimeFinPeriodoInf,
                columns: `,capuntes.diario,cdiarios.nomdia,
                            CASE WHEN capuntes.cuenta LIKE '9%' THEN capuntes.contra END contra,
                            CASE WHEN capuntes.cuenta LIKE '9%' THEN ccuentas2.nombre END nomtra,
                            CASE WHEN NVL(gcom_tercer.nombre, '-1') != '-1' THEN gcom_tercer.nombre
                                WHEN NVL(cven_tercer.NOMBRE, '-1') != '-1' THEN cven_tercer.nombre
                                ELSE ''
                            END nombre2,
                            CASE WHEN NVL(gcomfach.tercer, '-1') != '-1' THEN gcomfach.tercer
                                WHEN NVL(cvenfach.tercer, '-1') != '-1' THEN cvenfach.tercer
                                ELSE ''
                            END tercer,
                            ccuentas.nombre nombre_cta,
                            capuntes.user_created,capuntes.date_created,
                            capuntes.user_updated,capuntes.date_updated,
                            capuntes.apteid,capuntes.loteid,tmp_capuntes.nro_efecto`,
                order_str: '<order>capuntes.fecha,capuntes.asient,capuntes.orden,capuntes.apteid</order>'
            });
            // mRsPle_5_1_pt2 = mRsPle_5_1_pt2.rows().sort('apteid');

            var blob_pt2 = new Ax.sql.Blob(mStrNameFile+'.csv');

            new Ax.rs.Writer(mRsPle_5_1_pt2).csv(options => {
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
            mRsPle_5_1_pt2.close();

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
        
        // ===============================================================
        // Si la condición del reporte es Informe (I)
        // ===============================================================
    } else if(pStrCondicion == 'I') {

        var mRsPle_5_1 = __getRSCapuntes({
            limit: '',
            periodo: mStrCodPeriodo,
            cod_cta: `capuntes.cuenta::CHAR(18)`,
            tbl_tmp: mTmpTableGrpCapuntes,
            tbl_tmp_2: mTmpTableGrpCtaxHead,
            tbl_tmp_3: mTmpTableGrpFactura,
            tbl_tmp_4: mTmpTableGrpMovTesoreria,
            fec_ini: mDateTimeIniPeriodoInf,
            fec_fin: mDateTimeFinPeriodoInf,
            columns: `,capuntes.diario,cdiarios.nomdia,
                        CASE WHEN capuntes.cuenta LIKE '9%' THEN capuntes.contra END contra,
                        CASE WHEN capuntes.cuenta LIKE '9%' THEN ccuentas2.nombre END nomtra,
                        CASE WHEN NVL(gcom_tercer.nombre, '-1') != '-1' THEN gcom_tercer.nombre
                            WHEN NVL(cven_tercer.NOMBRE, '-1') != '-1' THEN cven_tercer.nombre
                            ELSE ''
                        END nombre2,
                        CASE WHEN NVL(gcomfach.tercer, '-1') != '-1' THEN gcomfach.tercer
                            WHEN NVL(cvenfach.tercer, '-1') != '-1' THEN cvenfach.tercer
                            ELSE ''
                        END tercer,
                        ccuentas.nombre nombre_cta,
                        capuntes.user_created,capuntes.date_created,
                        capuntes.user_updated,capuntes.date_updated,
                        capuntes.apteid,capuntes.loteid,tmp_capuntes.nro_efecto`,
            order_str: '<order>capuntes.fecha,capuntes.asient,capuntes.orden,capuntes.apteid</order>'
        });
        // return mRsPle_5_1.rows().sort('apteid');

        return mRsPle_5_1;
        
        // ===============================================================
        // Si la condición del reporte es Informe Fichero (IF)
        // ===============================================================
    } else if(pStrCondicion == 'IF'){
        var mRsPle_5_1 = __getRSCapuntes({
            limit: '',
            periodo: mStrCodPeriodo,
            cod_cta: `capuntes.cuenta::CHAR(18)`,
            tbl_tmp: mTmpTableGrpCapuntes,
            tbl_tmp_2: mTmpTableGrpCtaxHead,
            tbl_tmp_3: mTmpTableGrpFactura,
            tbl_tmp_4: mTmpTableGrpMovTesoreria,
            fec_ini: mDateTimeIniPeriodoInf,
            fec_fin: mDateTimeFinPeriodoInf,
            columns: `,capuntes.diario,cdiarios.nomdia,
                        CASE WHEN capuntes.cuenta LIKE '9%' THEN capuntes.contra END contra,
                        CASE WHEN capuntes.cuenta LIKE '9%' THEN ccuentas2.nombre END nomtra,
                        CASE WHEN NVL(gcom_tercer.nombre, '-1') != '-1' THEN gcom_tercer.nombre
                            WHEN NVL(cven_tercer.NOMBRE, '-1') != '-1' THEN cven_tercer.nombre
                            ELSE ''
                        END nombre2,
                        CASE WHEN NVL(gcomfach.tercer, '-1') != '-1' THEN gcomfach.tercer
                            WHEN NVL(cvenfach.tercer, '-1') != '-1' THEN cvenfach.tercer
                            ELSE ''
                        END tercer,
                        ccuentas.nombre nombre_cta,
                        capuntes.user_created,capuntes.date_created,
                        capuntes.user_updated,capuntes.date_updated,
                        capuntes.apteid,capuntes.loteid,tmp_capuntes.nro_efecto`,
            order_str: '<order>capuntes.fecha,capuntes.asient,capuntes.orden,capuntes.apteid</order>'
        });

        var mStrNameFile = 'ple_0501_'+mIntYear+'_'+mIntMonth;

        // ===============================================================
        // Definición del blob
        // ===============================================================
        var blob = new Ax.sql.Blob(mStrNameFile);

        // ===============================================================
        // Definición del archivo txt
        // ===============================================================
        new Ax.rs.Writer(mRsPle_5_1).csv(options => {
            options.setHeader(true);
            options.setDelimiter("|");
            options.setResource(blob);
            
        });
        mRsPle_5_1.close();

        // ===============================================================
        // Definición de file zip
        // ===============================================================
        var ficherozip = new Ax.io.File("/tmp/ziptest.zip");
        var zip = new Ax.util.zip.Zip(ficherozip);

        zip.zipFile(blob);
        zip.close();

        // ===============================================================
        // Definición blob del archivo zip
        // ===============================================================
        var dst = new Ax.io.File(ficherozip.getAbsolutePath());
        var fichero = new Ax.sql.Blob(dst);

        // ===============================================================
        // Definición ResultSet temporal
        // ===============================================================
        var mRsFile = new Ax.rs.Reader().memory(options => {
            options.setColumnNames(["nombre", "archivo"]);
            options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
        });
        mRsFile.rows().add([mStrNameFile + '.txt', fichero.getBytes()]);

        return mRsFile;
    }