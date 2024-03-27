/**
 *
 * v2.0
 * Name: pe_sunat_ple05_1_rep
 */

    // ===============================================================
    // Tipo de reporte y año/mes del periodo informado.
    // ===============================================================
var pStrCondicion   = Ax.context.variable.TIPO;
var mIntYear        = Ax.context.variable.YEAR;
var mIntMonth       = Ax.context.variable.MONTH;

// ===============================================================
// Construcción de la primera y ultima fecha del mes,
// correspondiente al periodo informado
// ===============================================================
var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth, 1);
var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth + 1, 0);

// ===============================================================
// Concatenación del identificador del periodo para el
// reporte de SUNAT
// ===============================================================
var mStrCodPeriodo = mIntYear.toString() + (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth) + '00';

// ===============================================================
// TABLA TEMPORAL PARA CARTERA DE EFECTOS
// ===============================================================
let mTmpTableCefectos = Ax.db.getTempTableName(`tmp_tbl_cefectos`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCefectos}`);

Ax.db.execute(`
        <select intotemp='${mTmpTableCefectos}'>
            <columns>
                capuntes.apteid,
                MAX(cefectos.fecven) fecven
            </columns>
            <from table='capuntes'>
                <join table='cefectos'>
                    <on>capuntes.apteid = cefectos.apteid</on>
                </join>
            </from>
            <where>
                <!-- capuntes.fecha BETWEEN '01-04-2023' AND '09-04-2023' -->
                capuntes.fecha BETWEEN ? AND ?
            </where>
            <group>1</group>
        </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

// ===============================================================
// RESULTSET DE LOS MOVIMIENTOS CONTABLES PARA EL PLE 5.1
// ===============================================================

/**
 * TODO:
 *  Hasta que se determine, de forma temporal se esta manejando asi:
 *  - Lo definido en el campo 21 compara el periodo informado (lo establecido como data de entrada)
 *    con el periodo actual (determinado por la fecha de hoy), si ambos coinciden se establece '1',
 *    si el periodo informado es menor se establece como '8' y en otro caso se establece como '9'
 */
var mRsPle_5_1 = Ax.db.executeQuery(`
        <select>
            <columns>
                capuntes.ejerci||capuntes.period||'00'                                                  <alias name='period' />,            <!-- Campo 01 -->
                capuntes.loteid                                                                         <alias name='cuo' />,               <!-- Campo 02 -->
                'AMC'||capuntes.loteid                                                                  <alias name='corr_asient' />,       <!-- Campo 03 -->
                capuntes.cuenta                                                                         <alias name='cod_cuenta'/>,         <!-- Campo 04 -->
        
                CAST(capuntes.proyec AS VARCHAR(24))                                                    <alias name='cod_operacion' />,     <!-- Campo 05 -->
                CAST(capuntes.seccio AS VARCHAR(24))                                                    <alias name='cod_centro_costo' />,  <!-- Campo 06 -->
                CAST(capuntes.moneda AS VARCHAR(3))                                                     <alias name='moneda' />,            <!-- Campo 07 -->
                ctax_move_head.taxh_ciftyp                                                              <alias name='tip_doc_emisor' />,    <!-- Campo 08 -->
                CAST(ctax_move_head.taxh_cifter AS VARCHAR(15))                                         <alias name='num_doc_emisor' />,    <!-- Campo 09 -->
                CAST(ctax_move_head.taxh_tipdoc AS VARCHAR(2))                                          <alias name='tip_doc_pago' />,      <!-- Campo 10 -->
                CAST(
                    SUBSTR(capuntes.docser, 1, CHARINDEX('-', capuntes.docser)-1)
                    AS VARCHAR(20)
                )                                                                                       <alias name='num_serie' />,         <!-- Campo 11 -->
        
                CAST(
                    SUBSTR(capuntes.docser, CHARINDEX('-', capuntes.docser)+1)
                    AS VARCHAR(20)
                )                                                                                       <alias name='num_correlativo' />,   <!-- Campo 12 -->
                TO_CHAR(capuntes.fecha, '%d/%m/%Y')                                                     <alias name='fecha_contable' />,    <!-- Campo 13 -->
                TO_CHAR(tmp_cefectos.fecven, '%d/%m/%Y')                                                <alias name='fecha_vencimiento' />, <!-- Campo 14 -->
                TO_CHAR(ctax_move_head.taxh_fecdoc, '%d/%m/%Y')                                         <alias name='fecha_operacion' />,   <!-- Campo 15 -->
                CAST(capuntes.concep AS VARCHAR(200))                                                   <alias name='glosa' />,             <!-- Campo 16 -->
                ''                                                                                      <alias name='glosa_referencial' />, <!-- Campo 17 -->
                CAST(ROUND(capuntes.debe, 2) AS VARCHAR(15))                                            <alias name='mov_debe' />,          <!-- Campo 18 -->
                CAST(ROUND(capuntes.haber, 2) AS VARCHAR(15))                                           <alias name='mov_haber' />,         <!-- Campo 19 -->
                CASE WHEN ctax_move_head.taxh_natfac = 'C' 
                          AND ctax_move_head.taxh_tipdoc NOT IN ('91', '97', '98') THEN '080100'
                     WHEN ctax_move_head.taxh_natfac = 'C' 
                          AND ctax_move_head.taxh_tipdoc IN ('91', '97', '98') THEN '080200'
                     WHEN ctax_move_head.taxh_natfac = 'V'  THEN '140100'
                     ELSE ''
                END                                                                                     <alias name='cod_libro' />,         <!-- Campo 20 -->
                '1'                                                                                     <alias name='estado_operacion' />,  <!-- Campo 21 -->
                <whitespace/>
            </columns>
            <from table='capuntes'>
                <join type='left' table='${mTmpTableCefectos}' alias='tmp_cefectos'>
                    <on>capuntes.apteid = tmp_cefectos.apteid</on>
                </join>
    
                <join type='left' table='ctax_move_head'>
                    <on>capuntes.apteid = ctax_move_head.taxh_apteid</on>
                </join>
            </from>
            <where> 
                capuntes.fecha BETWEEN ? AND ?
            </where>
        </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf).toMemory();

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
// ===============================================================
if(pStrCondicion == 'F') {

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
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if(pStrCondicion == 'I') {
    return mRsPle_5_1;
}