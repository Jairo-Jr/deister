// ===============================================================
// Tipo de reporte y año del periodo informado
// ===============================================================
var pStrCondicion   = 'I';
var mIntYear        = 2023;
var mIntMonth       = 12;

/**
 * RESULTSET SIRE COMPRAS no domiciliados
 */
var mRsSireComp = Ax.db.executeQuery(` 
    <select>
        <columns>
            ctax_move_head.taxh_ejefis || LPAD(ctax_move_head.taxh_perfis, 2, '0') || '00'                      periodo,            <!-- Campo 01 -->
            ''                                                                                                  car_sunat,          <!-- Campo 02 -->
            TO_CHAR(ctax_move_head.taxh_fecdoc, '%d/%m/%Y')                                                     fecha_emision,      <!-- Campo 03 -->
            ctax_move_head.taxh_tipdoc                                                                          tipo_documento,     <!-- Campo 04 -->
            SUBSTR(ctax_move_head.taxh_docser, 0, CHARINDEX('-', ctax_move_head.taxh_docser)-1)                 serie_documento,    <!-- Campo 05 -->
            LPAD(SUBSTR(ctax_move_head.taxh_docser, CHARINDEX('-', ctax_move_head.taxh_docser)+1), 8, '0')      num_documento,      <!-- Campo 06 -->
            ctax_move_head.taxh_import                                                                          valor_adq,          <!-- Campo 07 -->
            ''                                                                                                  otr_conceptos,      <!-- Campo 08 -->
            ctax_move_head.taxh_import                                                                          imp_total_adq,      <!-- Campo 09 -->
            ''                                                                                                  tipo_cp_cf,         <!-- Campo 10 -->
            ''                                                                                                  serie_cp_cf,        <!-- Campo 11 -->
            ''                                                                                                  año_emision_dam,    <!-- Campo 12 -->
            ''                                                                                                  num_cp,             <!-- Campo 13 -->
            ''                                                                                                  monto_retencion,    <!-- Campo 14 -->
            ctax_move_head.taxh_moneda                                                                          moneda,             <!-- Campo 15 -->
            ctax_move_head.taxh_cambio                                                                          tipo_cambio,        <!-- Campo 16 -->
            ctax_move_head.taxh_zondel                                                                          pais_residencia,    <!-- Campo 17 -->
            ctax_move_head.taxh_nombre                                                                          nom_no_domiciliado, <!-- Campo 18 -->
            ctax_move_head.taxh_direcc                                                                          domicilio,          <!-- Campo 19 -->
            ctax_move_head.taxh_cifter                                                                          id_sujeto,          <!-- Campo 20 -->
            ''                                                                                                  num_id_fiscal,      <!-- Campo 21 -->
            ''                                                                                                  nom_beneficiario,   <!-- Campo 22 -->
            ''                                                                                                  pais_beneficiario,  <!-- Campo 23 -->
            ''                                                                                                  vinculo,            <!-- Campo 24 -->
            ''                                                                                                  renta_bruta,        <!-- Campo 25 -->
            ''                                                                                                  deduccion_costo,    <!-- Campo 26 -->
            ''                                                                                                  renta_neta,         <!-- Campo 27 -->
            ''                                                                                                  tasa_retencion,     <!-- Campo 28 -->
            ''                                                                                                  imp_retencion,      <!-- Campo 29 -->
            '00'                                                                                                convenio,           <!-- Campo 30 -->
            ''                                                                                                  exoneracion_apli,   <!-- Campo 31 -->
            ''                                                                                                  tipo_renta,         <!-- Campo 32 -->
            ''                                                                                                  modalidad_serv,     <!-- Campo 33 -->
            ''                                                                                                  art_76,             <!-- Campo 34 -->
            ''                                                                                                  car_orig,           <!-- Campo 35 -->
            <whitespace /> campo36
        </columns>
        <from table='ctax_move_head'>
            <join type='left' table='ctax_move_line'>
                <on>ctax_move_head.taxh_seqno = ctax_move_line.taxh_seqno</on>
            </join>

            <join table='cenllote'>
                <on>ctax_move_head.taxh_loteid = cenllote.loteid</on>
            </join>
            
        </from>
        <where>
            cenllote.tabname = 'gcomfach'
            AND ctax_move_line.taxl_type = 'N'
            AND ctax_move_head.taxh_tipdoc IN ('91', '97', '98')
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
var mStrNameFile = 'LE' + mStrRuc + mStrYear + '0008040002' + mIntIndOperacion + mIntContLibro + mIntMoneda + '2.txt';

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