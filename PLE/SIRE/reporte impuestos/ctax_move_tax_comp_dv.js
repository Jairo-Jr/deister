let mTmpGrpCtaxHead = Ax.db.getTempTableName(`tmp_grp_ctax_head`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpGrpCtaxHead}`);
Ax.db.execute(`
        <select intotemp='${mTmpGrpCtaxHead}'>
            <columns>
                ctax_move_head.taxh_apteid, ctax_move_head.taxh_jusser, ctax_move_head.taxh_natfac,
                MAX(ctax_move_head.taxh_fecha) taxh_fecha,
                SUM(ctax_move_head.taxh_import) taxh_import,
                MAX(ctax_move_head.taxh_zonter) taxh_zonter,
                MAX(ctax_move_head.taxh_zondel) taxh_zondel,
                SUM(ctax_move_line.taxl_cuodeddiv) taxl_cuodeddiv,
                MAX(ctax_move_line.taxl_type) taxl_type,
                MAX(ctax_move_line.taxl_valida) taxl_valida,
                MAX(ctax_move_line.taxl_porpro) taxl_porpro,
                MAX(ctax_rule.rule_keyart) rule_keyart,
                MAX(ctax_artkey.artk_name) artk_name
            </columns>
            <from table='ctax_move_head'>
                <join table='ctax_move_line'>
                    <on>ctax_move_head.taxh_seqno = ctax_move_line.taxh_seqno</on>
                    <join type='left' table='ctax_rule'>
                        <on>ctax_move_line.taxl_rule = ctax_rule.rule_seqno</on>
                        <join type='left' table='ctax_artkey'>
                            <on>ctax_rule.rule_keyart = ctax_artkey.artk_code</on>
                        </join>
                    </join>
                </join>
            </from>
            <where>
                ctax_move_head.taxh_jusser = 'FCND0000045' AND

                ctax_move_head.taxh_ejefis BETWEEN 2024 AND 2024 AND
                ctax_move_head.taxh_perfis BETWEEN 1 AND 12 AND
                ctax_move_head.taxh_fecha  BETWEEN '05-01-2024' AND '05-02-2024'
            </where>
            <group>
                1, 2, 3
            </group>
        </select>
    `);


var rs = Ax.db.executeQuery(`
    <select>
        <columns>
            
            ctax_move_head.taxh_empcode,   grp_ctax_head.taxh_fecha,  
            <!-- ctax_move_head.taxh_seqno, -->     ctax_move_head.taxh_apteid,    
            ctax_move_head.taxh_natfac,    ctax_move_head.taxh_sistem,
            capuntes.diario,
            capuntes.asient,
            ctax_move_head.taxh_proyec,    
            ctax_move_head.taxh_seccio,    cseccion.nomsec,
            ctax_move_head.taxh_jusser,  
            <!-- ctax_move_head.taxh_tipdoc,   Tipo de documento-->  
            <!-- pe_sunat_tab10.tipo_cdp_desc, Descripción tipo documento-->
            ctax_move_head.taxh_auxchr4 tiposunat,
            CASE WHEN INSTR(taxh_docser,'-',1) != 0 THEN SUBSTRING_INDEX(taxh_docser, "-", 1) 
                ELSE ''
            END serie,                   <!--Serie-->
            CASE WHEN INSTR(taxh_docser,'-',1) != 0 THEN SUBSTRING_INDEX(taxh_docser, "-", -1) 
                ELSE taxh_docser
            END numero,                   <!--Numero-->
            ctax_move_head.taxh_docser,
            ctax_move_head.taxh_refter,   
            ctax_move_head.taxh_fecdoc,    ctax_move_head.taxh_fecope,
            cefectos.fecven,
            ctax_move_head.taxh_ejefis,
            ctax_move_head.taxh_perfis,    
            ctax_move_head.taxh_tercer,    
            ctax_move_head.taxh_tipdir,    ctax_move_head.taxh_nombre,
            ctax_move_head.taxh_cifter,    ctax_move_head.taxh_coda2, 
            ctax_move_head.taxh_codpos,    grp_ctax_head.taxh_import,
            grp_ctax_head.taxh_zondel,    grp_ctax_head.taxh_zonter, 
            ctax_move_head.taxh_info,      capuntes.concep glosadoc,
            <!--ctax_move_line.taxl_oper,-->      <!--ctax_move_line.taxl_code,-->
            grp_ctax_head.taxl_type,      grp_ctax_head.taxl_valida,
            <!--ctax_operation.oper_isp,       ctax_move_line.taxl_desgen,-->
            grp_ctax_head.taxl_porpro,    <!--ctax_move_line.taxl_porcen,-->
            
            <!--ctax_move_line.taxl_basimp,    ctax_move_line.taxl_basnimp,
            ctax_move_line.taxl_cuoded,    ctax_move_line.taxl_cuonded,
            (ctax_move_line.taxl_basimp + ctax_move_line.taxl_basnimp +
            ctax_move_line.taxl_cuoded + ctax_move_line.taxl_cuonded ) taxl_import,-->

            ctax_move_head.taxh_moneda,    ctax_move_head.taxh_cambio, 

            <!--ctax_move_line.taxl_basimpdiv, ctax_move_line.taxl_basnimpdiv,
            ctax_move_line.taxl_cuodeddiv, ctax_move_line.taxl_cuondeddiv,
            (ctax_move_line.taxl_basimpdiv +  ctax_move_line.taxl_basnimpdiv +
            ctax_move_line.taxl_cuodeddiv +  ctax_move_line.taxl_cuondeddiv ) taxl_impdiv,-->

            <!--ctax_move_line.taxl_seqno,-->
            <!--ctax_move_head.user_created,   ctax_move_head.date_created,-->
            CASE WHEN gcomfach.auxchr4 = '0' THEN '(SI)'
                WHEN gcomfach.auxchr4 = '1' THEN '(NO)'
            END <alias name='estatus'/>,
            ctercero_taxation.condic_contrib,
            CASE WHEN pe_sunat_padron_obliga_emie.pad_descrpag = 'FACTURA' THEN pe_sunat_padron_obliga_emie.pad_ruc
            END <alias name='pad_ruc'/>,
            CASE WHEN pe_sunat_padron_obliga_emie.pad_descrpag = 'FACTURA' THEN pe_sunat_padron_obliga_emie.pad_fecobl
            END <alias name='pad_fecobl'/>,
            ctax_move_line.taxl_auxnum1,    <!--Numero de contancia-->
            ctax_detracciones.fecpago,      <!--Fecha de pago-->
            grp_ctax_head.taxl_cuodeddiv,  <!--Impuesto deducible, divisa-->
            grp_ctax_head.rule_keyart,          <!--Clave artículo-->
            grp_ctax_head.artk_name,          <!--Descripción de la clave de artículo-->
            <!--Datos nota de crédito-->
            ctax_move_head.taxh_docrec,    
            CASE WHEN INSTR(taxh_docrec,'-',1) != 0 THEN SUBSTRING_INDEX(taxh_docrec, "-", 1) 
                ELSE ''
            END serierec,                  <!--Serie del documento rectificado-->
            CASE WHEN INSTR(taxh_docrec,'-',1) != 0 THEN SUBSTRING_INDEX(taxh_docrec, "-", -1) 
                ELSE taxh_docrec
            END numerorec,                  <!--Numero del documento rectificado-->
            ctax_move_head.taxh_fecrec,      <!--Fecha de nota de crédito-->
            0 igv_1,
            0 renta_1,
            0 precio_1,
            CASE WHEN NVL(ctax_move_line.taxl_code, ctax_type.type_code) IN ('IGVG', 'IGVS') THEN 'A'
                 WHEN NVL(ctax_move_line.taxl_code, ctax_type.type_code) = 'IGVH' THEN 'B'
                 WHEN NVL(ctax_move_line.taxl_code, ctax_type.type_code) IN ('IGVE', 'IGVI', 'IGVX') THEN 'D'
                 WHEN NVL(ctax_move_line.taxl_code, ctax_type.type_code) IN ('IGVR') THEN 'E'
                 ELSE NVL(ctax_move_line.taxl_code, ctax_type.type_code)
            END code_1,
            
            (NVL(ctax_move_line.taxl_basimp, 0) + NVL(ctax_move_line.taxl_basnimp, 0) +
            NVL(ctax_move_line.taxl_cuoded, 0) + NVL(ctax_move_line.taxl_cuonded, 0) ) import,

            0 igv_2,
            0 renta_2,
            0 precio_2,
            CASE WHEN NVL(ctax_move_line.taxl_code, ctax_type.type_code) IN ('IGVG', 'IGVS') THEN 'A'
                 WHEN NVL(ctax_move_line.taxl_code, ctax_type.type_code) = 'IGVH' THEN 'B'
                 WHEN NVL(ctax_move_line.taxl_code, ctax_type.type_code) IN ('IGVE', 'IGVI', 'IGVX') THEN 'D'
                 WHEN NVL(ctax_move_line.taxl_code, ctax_type.type_code) IN ('IGVR') THEN 'E'
                 ELSE NVL(ctax_move_line.taxl_code, ctax_type.type_code)
            END code_2,

            (NVL(ctax_move_line.taxl_basimpdiv, 0) +  NVL(ctax_move_line.taxl_basnimpdiv, 0) +
            NVL(ctax_move_line.taxl_cuodeddiv, 0) +  NVL(ctax_move_line.taxl_cuondeddiv, 0) ) impdiv
        </columns>
        <from table='ctax_move_head'>
            <join table='ctax_type'>
                <join table="ctax_class">
                    <on>ctax_type.type_class = ctax_class.class_code</on>
                    <on>ctax_class.class_type = 'N'</on>
                    <on>ctax_type.type_class = 'IGV'</on>
                </join>
                <join type='left' table='ctax_move_line'>
                    <on>ctax_move_head.taxh_seqno = ctax_move_line.taxh_seqno</on>
                    <on>ctax_type.type_code = ctax_move_line.taxl_code</on>
                    <join type='inner' table='ctax_operation' >
                        <on>ctax_move_line.taxl_oper = ctax_operation.oper_code</on>
                    </join>
                    <join type='left' table='ctax_detracciones'>
                        <on>ctax_move_line.taxl_auxnum1 = ctax_detracciones.constancia</on>
                    </join>
                    <join type='left' table='ctax_rule'>
                        <on>ctax_move_line.taxl_rule = ctax_rule.rule_seqno</on>
                        <join type='left' table='ctax_artkey'>
                            <on>ctax_rule.rule_keyart = ctax_artkey.artk_code</on>
                        </join>
                    </join>
                </join>
            </join>
            <join type="left" table='ctercero' >
                <on>ctax_move_head.taxh_tercer = ctercero.codigo</on>
                <join type="left" table='pe_sunat_padron_obliga_emie' >
                    <on> ctercero.cif =  pe_sunat_padron_obliga_emie.pad_ruc</on>
                    <on> 'FACTURA'    =  pe_sunat_padron_obliga_emie.pad_descrpag</on>
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
                <on>ctax_move_head.taxh_apteid = capuntes.apteid</on>
                <on>ctax_move_head.taxh_natfac = capuntes.origen</on>
                <!--<join type="left" table='cefectos'>
                    <on>capuntes.apteid = cefectos.apteid</on>
                </join>-->
                <join type="left" table='gcomfach'>
                    <on>capuntes.apteid =gcomfach.cabid</on>
                </join>
            </join>
            <lateral alias='cefectos'>
                <select>
                    <columns>MAX(cefectos.fecven) fecven, cefectos.apteid</columns>
                    <from table='cefectos' />
                    <where>
                        1 = 1 AND cefectos.tipefe NOT LIKE 'D%'
                    </where>
                    <group>
                        2
                    </group>
                </select>
            </lateral>
            <join table='${mTmpGrpCtaxHead}' alias = 'grp_ctax_head'>
                <on>ctax_move_head.taxh_apteid =grp_ctax_head.taxh_apteid</on>
                <on>ctax_move_head.taxh_jusser =grp_ctax_head.taxh_jusser</on>
                <on>ctax_move_head.taxh_natfac =grp_ctax_head.taxh_natfac</on>
            </join>
        </from>
        <where>
            ctax_move_head.taxh_jusser = 'FCND0000045' AND
            <!--ctax_move_line.taxl_type NOT IN ('R', 'D')  AND-->
            ctax_move_line.taxl_type = 'N' AND
            ctax_move_head.taxh_ejefis BETWEEN 2024 AND 2024 AND
            ctax_move_head.taxh_perfis BETWEEN 1 AND 12 AND
            ctax_move_head.taxh_fecha  BETWEEN '05-01-2024' AND '05-02-2024'  AND
            cefectos.apteid = ctax_move_head.taxh_apteid
            
        </where>
        <order>
            ctax_move_head.taxh_seqno, ctax_move_head.taxh_apteid, 54
        </order>
    </select>
`);

let mRsPivot = rs.pivot(options => {
    options.setPivotColumnNames(['code_1', 'code_2']);
    options.setMeasureColumnNames(['import', 'impdiv']);
});
// return mRsPivot;
var mRsOutput = new Ax.rs.Reader().memory(options => {
    options.setColumnNames([
        'taxh_empcode',
        'taxh_fecha',
        'taxh_apteid',
        'taxh_natfac',
        'taxh_sistem',
        'diario',
        'asient',
        'taxh_proyec',
        'taxh_seccio',
        'nomsec',
        'taxh_jusser',
        'tiposunat',
        'serie',
        'numero',
        'taxh_docser',
        'taxh_refter',
        'taxh_fecdoc',
        'taxh_fecope',
        'fecven',
        'taxh_ejefis',
        'taxh_perfis',
        'taxh_tercer',
        'taxh_tipdir',
        'taxh_nombre',
        'taxh_cifter',
        'taxh_coda2',
        'taxh_codpos',
        'taxh_import',
        'taxh_zondel',
        'taxh_zonter',
        'taxh_info',
        'glosadoc',
        'taxl_type',
        'taxl_valida',
        'taxl_porpro',
        'c1',
        'c2',
        'igv_1',
        'c3',
        'c4',
        'renta_1',
        'precio_1',
        'taxh_moneda',
        'taxh_cambio',
        'c5',
        'c6',
        'igv_2',
        'c7',
        'c8',
        'renta_2',
        'precio_2',
        'estatus',
        'condic_contrib',
        'pad_ruc',
        'pad_fecobl',
        'taxl_auxnum1',
        'fecpago',
        'taxl_cuodeddiv',
        'rule_keyart',
        'artk_name',
        'taxh_docrec',
        'serierec',
        'numerorec',
        'taxh_fecrec'
    ]);
    options.setColumnTypes([
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DATE,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DATE,
        Ax.sql.Types.DATE,
        Ax.sql.Types.DATE,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DATE,
        Ax.sql.Types.INTEGER,
        Ax.sql.Types.DATE,
        Ax.sql.Types.DOUBLE,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.CHAR,
        Ax.sql.Types.DATE
    ]);
});

for (let mRowPivot of mRsPivot) {
    mRowPivot.igv_1 = mRowPivot.c1 + mRowPivot.c2;
    mRowPivot.renta_1 = mRowPivot.c3 + mRowPivot.c4;
    mRowPivot.precio_1 = mRowPivot.c1 + mRowPivot.c2 + mRowPivot.c3 + mRowPivot.c4;

    mRowPivot.igv_2 = mRowPivot.c5 + mRowPivot.c6;
    mRowPivot.renta_2 = mRowPivot.c7 + mRowPivot.c8;
    mRowPivot.precio_2 = mRowPivot.c5 + mRowPivot.c6 + mRowPivot.c7 + mRowPivot.c8;

    console.log(mRowPivot)
    mRsOutput.rows().add(mRowPivot);
}

return mRsOutput;