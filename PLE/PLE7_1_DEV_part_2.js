/**
 * Name: pe_sunat_ple07_1_rep
 * Part: 2 - Obras en curso
 */

// ===============================================================
// Tipo de reporte y año del periodo informado
// ===============================================================
var pStrCondicion   = 'I';
var mIntYear        = 2023;

// ===============================================================
// DEFINICIÓN DE CAMPOS PERSONALIZADOS
// ===============================================================
var mStrColumn = pStrCondicion == 'F' ? 'tmp_cinmelem.codele' : `tmp_cinmelem.codele,tmp_cinmelem.fec_depre,tmp_cinmelem.loteid,tmp_cinmelem.docser`;

// ===============================================================
// TABLA TEMPORAL PARA ACTIVOS FIJOS
// ===============================================================
let mTmpTableActivos = Ax.db.getTempTableName(`tmp_cinmelem_activos_fijos`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableActivos}`);

Ax.db.execute(`
    <union type='all' intotemp='${mTmpTableActivos}'>
        <!-- ADQUISICIONES Y ADICIONES -->
        <select>
            <columns>
                cinmelem.codinm,
                cinmelem.codele,
                cinmcomp.docser,
                2022 ejerci,
                -5 codigo,
                'imp_adq_y_adic' nomper,
                0 loteid,
                SUM(CASE WHEN cinmelem.codinm = '999999' THEN ABS(cinmcval.invcom)
                         WHEN cinmelem.codinm = '777777' THEN ABS(cinmcval.invcom)*-1
                         ELSE 0
                    END) <alias name='imp_adq_y_adic' />,
                0 <alias name='impmax' />,
                0 <alias name='imp_depre_bajas' />,
                0 <alias name='imp_depre_ajustes' />,
                0 <alias name='imp_depre_acumulada' />,
                0 <alias name='imp_saldo_inicial' />,
                0 <alias name='imp_ret_baj' />,
                0 <alias name='imp_otros_ajus' />,
                DATE('01-01-2022') <alias name='fec_depre' />
            </columns>
            <from table='cinmelem'>
                <join table='cinmcomp'>
                    <on>cinmelem.empcode = cinmcomp.empcode</on>
                    <on>cinmelem.codinm = cinmcomp.codinm</on>
                    <on>cinmelem.codele = cinmcomp.codele</on>
                    <join table='cinmcval'>
                        <on>cinmcomp.empcode = cinmcval.empcode</on>
                        <on>cinmcomp.codinm = cinmcval.codinm</on>
                        <on>cinmcomp.codele = cinmcval.codele</on>
                        <on>cinmcomp.codcom = cinmcval.codcom</on>
                        <on>cinmcomp.numhis = cinmcomp.numhis</on>
                    </join>
                </join>
            </from>
            <where>
                cinmcomp.tipcom NOT IN ('E', 'D')
                AND cinmcomp.fecha BETWEEN '01-04-2023' AND '31-10-2023'
                AND cinmcomp.tipcom != 'J'
                AND cinmcomp.docser NOT LIKE 'FINV%'

                AND cinmelem.codinm IN ('999999', '777777')
            </where>
            <group>
                1, 2, 3
            </group>
        </select>
        

        <!-- IMPORTE OTROS AJUSTES -->
        <select>
            <columns>
                cinmelem.codinm,
                cinmelem.codele,
                cinmcomp.docser,
                2022 ejerci,
                0 codigo,
                'imp_otros_ajus' nomper,
                0 loteid,
                0 <alias name='imp_adq_y_adic' />,
                0 <alias name='impmax' />,
                0 <alias name='imp_depre_bajas' />,
                0 <alias name='imp_depre_ajustes' />,
                0 <alias name='imp_depre_acumulada' />,

                0 <alias name='imp_saldo_inicial' />,
                0 <alias name='imp_ret_baj' />,
                SUM(CASE WHEN cinmelem.codinm = '999999' THEN ABS(cinmcval.invcom)
                         WHEN cinmelem.codinm = '777777' THEN ABS(cinmcval.invcom)*-1
                         ELSE 0
                    END) <alias name='imp_otros_ajus' />,
                DATE('01-01-2022') <alias name='fec_depre' />
            </columns>
            <from table='cinmelem'>
                <join table='cinmcomp'>
                    <on>cinmelem.empcode = cinmcomp.empcode</on>
                    <on>cinmelem.codinm = cinmcomp.codinm</on>
                    <on>cinmelem.codele = cinmcomp.codele</on>
                    <join table='cinmcval'>
                        <on>cinmcomp.empcode = cinmcval.empcode</on>
                        <on>cinmcomp.codinm = cinmcval.codinm</on>
                        <on>cinmcomp.codele = cinmcval.codele</on>
                        <on>cinmcomp.codcom = cinmcval.codcom</on>
                        <on>cinmcomp.numhis = cinmcomp.numhis</on>
                    </join>
                </join>
            </from>
            <where>
                cinmcomp.tipcom NOT IN ('E', 'D')
                AND cinmcomp.fecha BETWEEN '01-04-2023' AND '31-10-2023'
                AND cinmcval.estado IN ('A', 'J')
                AND cinmcomp.docser LIKE 'FINV%'
            </where>
            <group>
                1, 2, 3
            </group>
        </select>
    </union>
`);


// ===============================================================
// TABLA TEMPORAL PARA VALORES DE COMPONENTE
// ===============================================================
let mTmpTableCinmcval = Ax.db.getTempTableName(`tmp_cinmelem_cinmcval`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmcval}`);

Ax.db.execute(`
        <select intotemp='${mTmpTableCinmcval}'>
            <columns>
                cinmelem.seqno,
                SUM(CASE WHEN YEAR(cinmcomp.fecbaj) = YEAR(TODAY) AND cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom)
                        WHEN YEAR(cinmcomp.fecha) &lt; YEAR(TODAY) THEN cinmcval.invcom
                END)                                                                    <alias name='imp_saldo_inicial' />,
                SUM(CASE WHEN YEAR(cinmcomp.fecha) = YEAR(TODAY)
                        AND cinmcomp.tipcom != 'J'
                        AND cinmcomp.docser NOT LIKE 'FINV%' THEN cinmcval.invcom
                    ELSE 0
                END)                                                                    <alias name='imp_adq_y_adic' />,
        
                SUM(CASE WHEN cinmcomp.tipcom = 'M' THEN cinmcval.invcom
                    ELSE 0
                    END)                                                                <alias name='imp_mejoras'/>,
                SUM(CASE WHEN cinmcomp.tipcom = 'B' THEN ABS(cinmcval.inicom) * -1
                    ELSE 0   
                END)                                                                     <alias name='imp_ret_baj' />,
                SUM(CASE WHEN cinmcomp.tipcom = 'J' THEN cinmcval.invcom
                    WHEN cinmcomp.docser LIKE 'FINV%' THEN cinmcval.invcom
                    ELSE 0   
                END)                                                                     <alias name='imp_otros_ajus' />,
                MIN(cinmcomp.fecha) <alias name='fecha_adq' />,
                MIN(NVL(cinmcomp.auxnum3, cinmcomp.fecini)) <alias name='fecha_uso' />,
                MIN(cinmftab.porcen) <alias name='porc_deprec' />,
                MIN(cinmcomp.fecha) <alias name='fecha' />
                
            </columns>
            <from table='cinmelem'>
                    <join table='cinmcomp'>
                        <on>cinmelem.empcode = cinmcomp.empcode</on>
                        <on>cinmelem.codinm = cinmcomp.codinm</on>
                        <on>cinmelem.codele = cinmcomp.codele</on>
                        <join table='cinmcval'>
                            <on>cinmcomp.empcode = cinmcval.empcode</on>
                            <on>cinmcomp.codinm = cinmcval.codinm</on>
                            <on>cinmcomp.codele = cinmcval.codele</on>
                            <on>cinmcomp.codcom = cinmcval.codcom</on>
                            <on>cinmcomp.numhis = cinmcomp.numhis</on>
                        </join>
                        <join type='left' table='cinmftab'>
                            <on>cinmcomp.codfis = cinmftab.codigo</on>
                        </join>
                    </join>
            </from>
            <where>
                cinmcomp.tipcom NOT IN ('E', 'D')
                <!--AND (cinmcomp.docser LIKE 'FACT%' OR cinmcomp.docser LIKE 'FINV%' OR cinmcomp.docser LIKE 'FVAR%' OR cinmcomp.docser LIKE 'RFIN%' OR cinmcomp.docser LIKE 'SFIN%')-->
            </where>
            <group>
                1
            </group>
        </select>
    `);


/**
 * AGRUPA EQUIPO-MAQUINA
 */
let mTmpTableCinmelemPpe = Ax.db.getTempTableName(`tmp_cinmelem_ppe`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmelemPpe}`);

Ax.db.execute(`
    <select intotemp='${mTmpTableCinmelemPpe}'>
        <columns>
            cinmelem.seqno,
            MAX(cinmelem_ppe.ppe_numser) ppe_numser,
            MAX(cinmelem_ppe.ppe_label_id) ppe_label_id,
            MAX(gartmarc.nommar) nommar,
            MAX(gartmode.nommod) nommod
        </columns>
        <from table='cinmelem'>
            <join type='left' table='cinmelem_ppe'>
                <on>cinmelem.empcode = cinmelem_ppe.ppe_empcode</on>
                <on>cinmelem.codinm = cinmelem_ppe.ppe_codinm</on>
                <on>cinmelem.codele = cinmelem_ppe.ppe_codele</on>
                <join type='left' table='gartmarc'>
                    <on>cinmelem_ppe.ppe_marca = gartmarc.codigo</on>
                    <join type='left' table='gartmode'>
                        <on>gartmarc.codigo = gartmode.marca</on>
                        <on>cinmelem_ppe.ppe_modelo = gartmode.modelo</on>
                    </join>
                </join>
            </join>
        </from>
        <group>
            1
        </group>
    </select>
`);

/**
 * AGRUPA EQUIPO-MAQUINA
 */
let mTmpTableAsientoActivoFijo = Ax.db.getTempTableName(`tmp_crp_asiento_activofijo`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableAsientoActivoFijo}`);

Ax.db.execute(`
    <select intotemp='${mTmpTableAsientoActivoFijo}'>
        <columns>
            DISTINCT DATE(fecha_docu) fecha_docu, nro_asien_ch
        </columns>
        <from table='crp_asiento_activofijo' />
        <where>
            MONTH(fecha_docu) &gt;= 4 
            AND YEAR(fecha_docu) = 2023
        </where>
    </select>
`);

// ===============================================================
// TABLA TEMPORAL DE ELEMENTOS
// ===============================================================
let mTmpTableCinmelem = Ax.db.getTempTableName(`tmp_cinmelem_ple`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCinmelem}`);

Ax.db.execute(`
        <select intotemp='${mTmpTableCinmelem}'>
            <columns>
                ${mIntYear} || '0000'                                                                       <alias name='periodo' />,
                <!-- NVL(CASE WHEN tmp_cinmcval.fecha &lt; '01-01-${mIntYear}' THEN '00000000.'
                        ELSE cinmelem.auxchr2
                END, '')                                                                                    <alias name='cuo' />, -->
                'S/N CUO' <alias name='cuo' />,
                'A-M-C'                                                                                     <alias name='corr_asiento' />,
                '9'                                                                                         <alias name='cod_catalogo' />,
                REPLACE(cinmelem_ppe.ppe_label_id, '/', '-')                                                <alias name='cod_activo' />,
                ''                                                                                          <alias name='codigo_del_catalogo_utilizado' />,
                RPAD(TRIM(cinmhead.auxchr1), 16,'0')                                                        <alias name='cod_existencia' />,
                '1'                                                                                         <alias name='tipo_activo' />,
                ''                                                                                          <alias name='cta_contable' />,
                '9'                                                                                         <alias name='estado_act' />,
                REPLACE(cinmelem.nomele, '/', '-')                                                          <alias name='descripcion_activo' />,
                REPLACE(cinmelem_ppe.nommar, '/', '-')                                                          <alias name='marca' />,
                REPLACE(cinmelem_ppe.nommod, '/', '-')                                                          <alias name='modelo' />,
                cinmelem_ppe.ppe_numser  <alias name='nro_serie' />,
                CASE WHEN tmp_activos_fijos.codigo = -4 THEN tmp_activos_fijos.imp_saldo_inicial 
                        ELSE 0 
                END                                                                                         <alias name='imp_saldo_inicial' />,

                CASE WHEN cinmelem.codinm = '999999' THEN ABS(tmp_activos_fijos.imp_adq_y_adic)
                     WHEN cinmelem.codinm = '777777' THEN ABS(tmp_activos_fijos.imp_adq_y_adic)*-1
                        ELSE 0 
                END                                                                                         <alias name='imp_adq_y_adic' />,

                tmp_cinmcval.imp_mejoras                                                                    <alias name='imp_mejoras' />,
                CASE WHEN tmp_activos_fijos.codigo = -3 THEN tmp_activos_fijos.imp_ret_baj
                        ELSE 0
                END                                                                                         <alias name='imp_bajas' />,

                CASE WHEN cinmelem.codinm = '999999' THEN ABS(tmp_activos_fijos.imp_otros_ajus)
                     WHEN cinmelem.codinm = '777777' THEN ABS(tmp_activos_fijos.imp_otros_ajus)*-1
                        ELSE 0
                END                                                                                         <alias name='imp_ajustes' />,

                '0.00'                                                                                      <alias name='imp_revaluac_volunt' />,
                '0.00'                                                                                      <alias name='imp_revaluac_reorg' />,
                '0.00'                                                                                      <alias name='imp_revaluac_otras' />,
                '0.00'                                                                                      <alias name='imp_ajuste_inflac' />,
                TO_CHAR(tmp_cinmcval.fecha_adq, '%d/%m/%Y')                                           <alias name='fecha_adq' />,
                TO_CHAR(tmp_cinmcval.fecha_uso, '%d/%m/%Y')                                                 <alias name='fecha_uso' />,
                '1'                                                                                         <alias name='metodo_calc' />,
                '00000'                                                                                     <alias name='nro_autoriz_camb_calc' />,
                tmp_cinmcval.porc_deprec                                                                    <alias name='porc_deprec' />,
                CASE WHEN tmp_activos_fijos.codigo = -2 THEN ABS(tmp_activos_fijos.imp_depre_acumulada)*-1 
                        ELSE 0 
                END                                                                                         <alias name='imp_depre_acumulada' />,
                CASE WHEN tmp_activos_fijos.ejerci = YEAR(TODAY) THEN ABS(tmp_activos_fijos.impmax)*-1 
                        ELSE 0
                END                                                                                         <alias name='imp_depre_sin_revaluac' />,
                CASE WHEN tmp_activos_fijos.codigo = -1 THEN tmp_activos_fijos.imp_depre_bajas
                        ELSE 0
                END                                                                                         <alias name='imp_depre_bajas' />,
                tmp_activos_fijos.imp_depre_ajustes                                                         <alias name='imp_depre_ajustes' />,
                '0.00'                                                                                           <alias name='imp_depre_revaluac_volunt' />,
                '0.00'                                                                                           <alias name='imp_depre_revaluac_reorg' />,
                '0.00'                                                                                           <alias name='imp_depre_revaluac_otras' />,
                '0.00'                                                                                           <alias name='imp_depre_ajuste_inflac' />,
                '1'                                                                                         <alias name='estado_ope' />,
                
                cinmelem.codele,
                cinmelem.empcode,
                cinmelem.codcta,
                cinmelem.auxchr2,
                crp_asiento_activofijo.nro_asien_ch,
                tmp_activos_fijos.loteid,
                tmp_activos_fijos.codigo,
                tmp_activos_fijos.fec_depre,
                tmp_activos_fijos.docser,
                cinmelem.seqno
            </columns>
            <from table='cinmhead'>
                <join table='cinmelem'>
                    <on>cinmhead.empcode = cinmelem.empcode</on>
                    <on>cinmhead.codinm = cinmelem.codinm</on>
                    <join table='${mTmpTableActivos}' alias='tmp_activos_fijos'>
                        <on>cinmelem.codinm = tmp_activos_fijos.codinm</on>
                        <on>cinmelem.codele = tmp_activos_fijos.codele</on>
                        <join type='left' table='${mTmpTableAsientoActivoFijo}' alias='crp_asiento_activofijo'>
                            <on>tmp_activos_fijos.ejerci = YEAR(crp_asiento_activofijo.fecha_docu)</on>
                            <on>tmp_activos_fijos.codigo = MONTH(crp_asiento_activofijo.fecha_docu)</on>
                        </join>
                    </join>

                    <join type='left' table='${mTmpTableCinmelemPpe}' alias='cinmelem_ppe'>
                        <on>cinmelem.seqno = cinmelem_ppe.seqno</on>
                    </join>

                    <join type='left' table='${mTmpTableCinmcval}' alias='tmp_cinmcval'>
                        <on>cinmelem.seqno = tmp_cinmcval.seqno</on>
                    </join>

                </join>
            </from>
            <where>
                tmp_activos_fijos.ejerci &gt;= ${mIntYear} - 1

                <!--AND cinmhead.codgrp NOT IN ('12')-->
                <!--AND cinmelem.codinm IN ('999999', '777777')-->




                <!--AND cinmhead.codgrp IN ('02', '03', '04', '05', '06', '07', '08', '09')-->
                <!-- AND cinmelem.seqno = 16248 -->
                <!--AND cinmelem.codele = '125014528'-->
                <!-- AND cinmelem.codele IN ('125000078', '125016050', '125016047') -->
            </where>
        </select>
    `);

/**
 * RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 7.1
 */
var mStringPle7_1 = Ax.db.executeQuery(` 
        <select>
            <columns>
                periodo,
                CAST((
                    CASE WHEN tmp_cinmelem.fec_depre &lt; '01-01-${mIntYear}' THEN '00000000'
                            WHEN tmp_cinmelem.fec_depre &gt;= '01-04-${mIntYear}' THEN tmp_cinmelem.nro_asien_ch
                            WHEN (imp_saldo_inicial != 0 OR imp_adq_y_adic != 0 OR imp_mejoras != 0 OR imp_bajas != 0 OR imp_ajustes != 0) AND tmp_cinmelem.auxchr2 IS NOT NULL THEN tmp_cinmelem.auxchr2
                            WHEN (imp_depre_acumulada != 0 OR imp_depre_sin_revaluac != 0 OR imp_depre_bajas != 0 OR imp_depre_ajustes != 0) AND tmp_cinmelem.nro_asien_ch IS NOT NULL THEN tmp_cinmelem.nro_asien_ch
                            ELSE '0'
                    END
                ) AS VARCHAR(40)) cuo,                                                     
                CAST(corr_asiento AS VARCHAR(10)) corr_asiento,
                cod_catalogo,
                REPLACE(CAST(cod_activo AS VARCHAR(24)), '_', '') cod_activo,
                codigo_del_catalogo_utilizado,
                cod_existencia,
                tipo_activo,
                CASE WHEN imp_saldo_inicial != 0 OR imp_adq_y_adic != 0 OR imp_mejoras != 0 OR imp_bajas != 0 OR imp_ajustes != 0 THEN crp_chv_mapcta1.ctaori
                        WHEN imp_depre_acumulada != 0 OR imp_depre_sin_revaluac != 0 OR imp_depre_bajas != 0 OR imp_depre_ajustes != 0 THEN crp_chv_mapcta2.ctaori
                        ELSE crp_chv_mapcta2.ctaori
                END cta_contable,
                estado_act,
                CAST(NVL(descripcion_activo, '-') AS VARCHAR(40)) descripcion_activo,
                CAST(NVL(marca, '-') AS VARCHAR(20)) marca,
                CAST(NVL(modelo, '-') AS VARCHAR(20)) modelo,
                CAST(NVL(nro_serie, '-') AS VARCHAR(30)) nro_serie,
                NVL( CAST(ROUND(imp_saldo_inicial, 2) AS VARCHAR(15)) , '0.00') imp_saldo_inicial,
                NVL( CAST(ROUND(imp_adq_y_adic, 2) AS VARCHAR(15)) , '0.00') imp_adq_y_adic,
                NVL( CAST(ROUND(imp_mejoras, 2) AS VARCHAR(15)) , '0.00') imp_mejoras,
                NVL( CAST(ROUND(imp_bajas, 2) AS VARCHAR(15)) , '0.00') imp_bajas,
                NVL( CAST(ROUND(imp_ajustes, 2) AS VARCHAR(15)) , '0.00') imp_ajustes,
                imp_revaluac_volunt,
                imp_revaluac_reorg,
                imp_revaluac_otras,
                imp_ajuste_inflac,
                fecha_adq,
                fecha_uso,
                metodo_calc,
                nro_autoriz_camb_calc,
                NVL( CAST(ROUND(porc_deprec, 2) AS VARCHAR(6)) , '0.00') porc_deprec,
                NVL( CAST(ROUND(imp_depre_acumulada, 2) AS VARCHAR(15)) , '0.00') imp_depre_acumulada,
                NVL( CAST(ROUND(imp_depre_sin_revaluac, 2) AS VARCHAR(15)) , '0.00') imp_depre_sin_revaluac,
                NVL( CAST(ROUND(imp_depre_bajas, 2) AS VARCHAR(15)) , '0.00') imp_depre_bajas,
                NVL( CAST(ROUND(imp_depre_ajustes, 2) AS VARCHAR(15)) , '0.00') imp_depre_ajustes,
                imp_depre_revaluac_volunt,
                imp_depre_revaluac_reorg,
                imp_depre_revaluac_otras,
                imp_depre_ajuste_inflac,
                estado_ope,
                ${mStrColumn}
            </columns>
            <from table='${mTmpTableCinmelem}' alias='tmp_cinmelem'>
                <join type='left' table='cempresa'>
                    <on>tmp_cinmelem.empcode = cempresa.empcode</on>
                    <on>tmp_cinmelem.codcta  = cinmctas.codigo</on>
                    <join type='left' table='cinmctas'>
                        <on>cempresa.placon  = cinmctas.placon</on>
                        <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta1'>>
                            <on>cinmctas.ccinmo = crp_chv_mapcta1.cuenta</on>
                        </join>
                        <join type='left' table='crp_chv_mapcta' alias='crp_chv_mapcta2'>
                            <on>cinmctas.ccamor = crp_chv_mapcta2.cuenta</on>
                        </join>
                    </join>
                </join>
            </from>
            <order>
                tmp_cinmelem.codele, tmp_cinmelem.codigo
            </order>
        </select>
    `).toJSON();

var mObjPle7_1 = JSON.parse(mStringPle7_1);
var mArrayPle7_1 = mObjPle7_1.rowset;

var i=0;
var mIntCorrelativo = 1;

/**
 * Correlativo unico temporal
 */
var mIntSecAsien = 1;
var mStrElemento = '0';

mArrayPle7_1.forEach(row => {
    // console.log(row);
    mArrayPle7_1[i][4] = Ax.db.call('icon_char_filter', 'es_aeat', mArrayPle7_1[i][4]);
    if(mArrayPle7_1[i][4] == null){
        // console.log(row);
    }

    var mStrDesc = mArrayPle7_1[i][10].replace(/[ªº·¬¿¡´ç¨~!@#$%^&*()_|+=?;:'",.<>\{\}\[\]\\\/]/gi, '');
    mArrayPle7_1[i][10] = mStrDesc.trim();
    var mStrMarca = mArrayPle7_1[i][11].replace(/[ªº·¬¿¡´ç¨~!@#$%^&*()_|+=?;:'",.<>\{\}\[\]\\\/]/gi, '');
    mArrayPle7_1[i][11] = mStrMarca.trim();
    var mStrModel = mArrayPle7_1[i][12].replace(/[ªº·¬¿¡´ç¨~!@#$%^&*()_|+=?;:'",.<>\{\}\[\]\\\/]/gi, '');
    mArrayPle7_1[i][12] = mStrModel.trim();
    var mStrSerie = mArrayPle7_1[i][13].replace(/[ªº·¬¿¡´ç¨~!@#$%^&*()_|+=?;:'",.<>\{\}\[\]\\\/]/gi, '');
    mArrayPle7_1[i][13] = mStrSerie.trim();

    /**
     * ASIGNACION DE CORRELATIVO
     */
    var mStrCodAsiento = (row[1] == '00000000') ? 'A' : 'M';
    if(mStrElemento == row[37]){
        if(row[1] == 'null' || row[1] == null){mArrayPle7_1[i][1], row[1] = ''; console.log('NULL', row)}
        mArrayPle7_1[i][1] = row[1] + '.'+ mIntCorrelativo;
        // console.log(row[1])
        var mStrCorrAsiento = mStrCodAsiento + mArrayPle7_1[i][1].split('.')[0];
        mArrayPle7_1[i][2] = mStrCorrAsiento.substring(0, 10);
        // mIntCorrelativo++;
    } else {
        // mIntCorrelativo = 1;
        if(row[1] == 'null' || row[1] == null){mArrayPle7_1[i][1], row[1] = ''; console.log('NULL', row)}
        mStrElemento = mArrayPle7_1[i][37];
        mArrayPle7_1[i][1] = row[1] + '.' + mIntCorrelativo;
        var mStrCorrAsiento = mStrCodAsiento + mArrayPle7_1[i][1].split('.')[0];
        mArrayPle7_1[i][2] = mStrCorrAsiento.substring(0, 10);
        // mIntCorrelativo++;
    }
    if (pStrCondicion == 'F') {mArrayPle7_1[i][37] = ''}
    mIntCorrelativo++;
    i++;
});

mObjPle7_1.rowset = mArrayPle7_1;
mStringPle7_1 = JSON.stringify(mObjPle7_1)

// mStringPle7_1 =
var mRsPLE7_1 = new Ax.rs.Reader().json(options => {
    options.setStringResource(mStringPle7_1);
});


// ===============================================================
// Variables del nombre del archivo
// ===============================================================
var mStrRuc             = '20100121809';
var mStrYear            = mIntYear;
var mIntIndOperacion    = 1;
var mIntContLibro       = 1;
var mIntMoneda          = 1;

// ===============================================================
// Estructura de nombre del archivo txt de salida:
// LERRRRRRRRRRRAAAA000007010000OIM1.TXT
// ===============================================================
var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007010000' + mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

// ===============================================================
// Si la condición del reporte es Fichero (F)
// ===============================================================
if (pStrCondicion == 'F') {

    // ===============================================================
    // Definición del blob
    // ===============================================================
    var blob = new Ax.sql.Blob(mStrNameFile);

    // ===============================================================
    // Definición del archivo txt
    // ===============================================================
    new Ax.rs.Writer(mRsPLE7_1).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(blob);
    });

    // ===============================================================
    // Definición de file zip
    // ===============================================================
    var ficherozip  = new Ax.io.File("/tmp/ziptest.zip");
    var zip         = new Ax.util.zip.Zip(ficherozip);

    zip.zipFile(blob);
    zip.close();

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var dst     = new Ax.io.File(ficherozip.getAbsolutePath());
    var fichero = new Ax.sql.Blob(dst);

    // ===============================================================
    // Definición ResultSet temporal
    // ===============================================================
    var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["name", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    });
    mRsFile.rows().add([mStrNameFile, fichero.getBytes()]);

    return mRsFile;

    // ===============================================================
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if(pStrCondicion == 'E') {
    var blob = new Ax.sql.Blob("rep_ple7_1.csv");
    new Ax.rs.Writer(mRsPLE7_1).csv(options => {
        options.setCharset('ISO-8859-1');
        options.withQuote('"');                 // Character used to quote fields
        options.withQuoteMode("NON_NUMERIC");   // Quote all non numeric fields: ALL, ALL_NON_NULL, MINIMAL, NON_NUMERIC, NONE

        options.setQuoteChar('"');
        options.setDelimiter("|");
        options.getFormats().setNumberFormat("numdec_es", "##.##", "es");

        options.setResource(blob);

        // Add a header for Excel to allow it recognises file as CSV
        options.setHeaderText("sep=" + options.getDelimiter());
    });
    return blob;

    // ===============================================================
    // Definición ResultSet temporal
    // ===============================================================
    /*var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["name", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    });
    mRsFile.rows().add(['rep_ple7_1.csv', blob]);

    return mRsFile;*/

} else if (pStrCondicion == 'I') {
    return mRsPLE7_1;
}