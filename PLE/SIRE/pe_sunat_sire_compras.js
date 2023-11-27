// ===============================================================
// Tipo de reporte y año del periodo informado
// ===============================================================
var pStrCondicion   = Ax.context.variable.TIPO;
var mIntYear        = Ax.context.variable.YEAR;
var mIntMonth       = Ax.context.variable.MONTH;

// ===============================================================
// TABLA TEMPORAL DE EFECTOS
// ===============================================================
let mTmpCefectos = Ax.db.getTempTableName(`tmp_ctax_cefectos`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpCefectos}`);

Ax.db.execute(`
        <select intotemp='${mTmpCefectos}'>
            <columns>
                ctax_move_head.taxh_seqno,
                MAX(cefectos.fecven) fecven,
                MAX(cefectos.impdiv) impdiv
            </columns>
            <from table='ctax_move_head'>
                <join table='cefectos'>
                    <on>cefectos.auxnum4 = ctax_move_head.taxh_loteid</on>
                </join>
            </from>
            <group>
                1
            </group>
        </select>
    `);

/**
 * RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 7.1
 */
var mRsSireComp = Ax.db.executeQuery(` 
        <select>
            <columns>
                cempresa.cifemp                                                                                     ruc_emp,            <!-- Campo 01 -->
                cempresa.empname                                                                                    nombre_emp,         <!-- Campo 02 -->
                ctax_move_head.taxh_ejefis || LPAD(ctax_move_head.taxh_perfis, 2, '0') || '00'                      periodo,            <!-- Campo 03 -->
                ''                                                                                                  car_sunat,          <!-- Campo 04 -->
                TO_CHAR(ctax_move_head.taxh_fecdoc, '%d/%m/%Y')                                                     fecha_emision,      <!-- Campo 05 -->
                TO_CHAR(tmp_cefectos.fecven, '%d/%m/%Y')                                                            fecha_vencimiento,  <!-- Campo 06 -->
                ctax_move_head.taxh_tipdoc                                                                          tipo_documento,     <!-- Campo 07 -->
                SUBSTR(ctax_move_head.taxh_docser, 0, CHARINDEX('-', ctax_move_head.taxh_docser)-1)                 serie_documento,    <!-- Campo 08 -->
                CASE WHEN ctax_move_head.taxh_tipdoc IN ('50' , '51', '52', '53', '54') THEN YEAR(gcomfach.fecope)
                END                                                                                                 año_emision,        <!-- Campo 09 -->
                LPAD(SUBSTR(ctax_move_head.taxh_docser, CHARINDEX('-', ctax_move_head.taxh_docser)+1), 8, '0')      num_documento,      <!-- Campo 10 -->
                ''                                                                                                  nro_final,          <!-- Campo 11 -->
                ctax_move_head.taxh_ciftyp                                                                          tipo_doc_tercer,    <!-- Campo 12 -->
                ctax_move_head.taxh_cifter                                                                          nro_doc_tercer,     <!-- Campo 13 -->
                ctax_move_head.taxh_nombre                                                                          nom_tercer,         <!-- Campo 14 -->
    
                CASE WHEN ctax_move_line.taxl_type = 'N' AND 
                          ctax_move_line.taxl_porcen &gt; 0 THEN ctax_move_line.taxl_basimp
                     ELSE 0
                END                                                                                                 bi_gravado_dg,      <!-- Campo 15 -->
                CASE WHEN ctax_move_line.taxl_type = 'N' AND 
                          ctax_move_line.taxl_porcen &gt; 0 THEN ctax_move_line.taxl_cuoded
                     ELSE 0
                END                                                                                                 igv_dg,             <!-- Campo 16 -->
                CASE WHEN ctax_move_line.taxl_type = 'N' AND 
                          ctax_move_line.taxl_porcen &gt; 0 THEN ctax_move_line.taxl_basimp
                     ELSE 0
                END                                                                                                 bi_gravado_dgng,    <!-- Campo 17 -->
                CASE WHEN ctax_move_line.taxl_type = 'N' AND 
                          ctax_move_line.taxl_porcen &gt; 0 THEN ctax_move_line.taxl_cuoded
                     ELSE 0
                END                                                                                                 igv_dgng,           <!-- Campo 18 -->
                CASE WHEN ctax_move_line.taxl_type = 'N' AND 
                          ctax_move_line.taxl_porcen &gt; 0 THEN ctax_move_line.taxl_basimp
                     ELSE 0
                END                                                                                                 bi_gravado_dng,     <!-- Campo 19 -->
                CASE WHEN ctax_move_line.taxl_type = 'N' AND 
                          ctax_move_line.taxl_porcen &gt; 0 THEN ctax_move_line.taxl_cuoded
                     ELSE 0
                END                                                                                                 igv_dng,            <!-- Campo 20 -->
                CASE WHEN ctax_move_line.taxl_type = 'N' AND 
                          ctax_move_line.taxl_porcen = 0 THEN ctax_move_line.taxl_basimp
                     ELSE 0
                END                                                                                                 valor_adq_ng,       <!-- Campo 21 -->
                '0.00'                                                                                              isc,                <!-- Campo 22 -->
                '0.00'                                                                                              icbper,             <!-- Campo 23 -->
                '0.00'                                                                                              otros_trib_cargos,  <!-- Campo 24 -->
    
                ctax_move_head.taxh_import                                                                          imp_total_adq,      <!-- Campo 25 -->
                ctax_move_head.taxh_moneda                                                                          moneda,             <!-- Campo 26 -->
                ctax_move_head.taxh_cambio                                                                          tipo_cambio,        <!-- Campo 27 -->
    
                <!-- Rectificacion -->
                ctax_move_recti.taxh_fecha                                                                          fec_emision_rect,   <!-- Campo 28 -->
                ctax_move_recti.taxh_tipdoc                                                                         tip_doc_rect,       <!-- Campo 29 -->
                SUBSTR(ctax_move_recti.taxh_docser, 0, CHARINDEX('-', ctax_move_recti.taxh_docser)-1)               serie_doc_rect,     <!-- Campo 30 -->
                ''                                                                                                  cod_dependencia,    <!-- Campo 31 -->
                LPAD(SUBSTR(ctax_move_recti.taxh_docser, CHARINDEX('-', ctax_move_recti.taxh_docser)+1), 8, '0')    num_doc_rect,       <!-- Campo 32 -->
    
                '0'                                                                                                 clasif_bienes_serv, <!-- Campo 33 -->
                ''                                                                                                  id_contrato,        <!-- Campo 34 -->
                ''                                                                                                  porcen_contrato,    <!-- Campo 35 -->
                ''                                                                                                  imb,                <!-- Campo 36 -->
                ''                                                                                                  car_rect,           <!-- Campo 37 -->
                <whitespace /> campo38
            </columns>
            <from table='ctax_move_head'>
                <join type='left' table='ctax_move_line'>
                    <on>ctax_move_head.taxh_seqno = ctax_move_line.taxh_seqno</on>
                </join>
    
                <join type='left' table='${mTmpCefectos}' alias='tmp_cefectos'>
                    <on>ctax_move_head.taxh_seqno = tmp_cefectos.taxh_seqno</on>
                </join>
                <join table='cenllote'>
                    <on>ctax_move_head.taxh_loteid = cenllote.loteid</on>
                </join>
                <join table='gcomfach'>
                    <on>ctax_move_head.taxh_loteid = gcomfach.loteid</on>
                    <join table='ctercero'>
                        <on>gcomfach.tercer = ctercero.codigo</on>
                    </join>
                </join>
                <join type='left' table='cempresa'>
                    <on>ctax_move_head.taxh_empcode = cempresa.empcode</on>
                </join>
    
                <!-- Rectificacion -->
                <join type='left' table='ctax_move_head' alias='ctax_move_recti'>
                    <on>ctax_move_head.taxh_docrec = ctax_move_recti.taxh_docser</on>
                    <on>ctax_move_head.taxh_tercer = ctax_move_recti.taxh_tercer</on>
                    <on>ctax_move_head.taxh_fecrec = ctax_move_recti.taxh_fecha</on>
                </join>
            </from>
            <where>
                cenllote.tabname = 'gcomfach'
    
                <!-- AND ctax_move_head.taxh_jusser IN ('FMAN0000414', 'FMAN0000415', 'FMAN0000416', 'FACT0000065', 'NCSE0000005', 'FREL0000992') -->
    
                AND ctax_move_head.taxh_ejefis = ${mIntYear}
                AND ctax_move_head.taxh_perfis = ${mIntMonth}
            </where>
        </select>
    `);

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
    new Ax.rs.Writer(mRsSireComp).csv(options => {
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
    new Ax.rs.Writer(mRsSireComp).csv(options => {
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
    return mRsSireComp;
}