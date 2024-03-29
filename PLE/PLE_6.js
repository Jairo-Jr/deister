/**
 * Name: pe_sunat_ple06_rep
 */

// ===============================================================
// Tipo de reporte y año/mes del periodo informado
// =============================================================== 
var mStrCondicion   = 'F';
var mIntYear        = 2023;
var mIntMonth       = 3;
// var mStrCondicion   = Ax.context.variable.TIPO;
// var mIntYear   = Ax.context.variable.YEAR;
// var mIntMonth     = Ax.context.variable.MONTH;

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
// TABLA TEMPORAL PARA APUNTES CONTABLES
// ===============================================================
let mTmpTableCapuntes = Ax.db.getTempTableName(`@tmp_tbl_capuntes`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableCapuntes}`);

Ax.db.execute(`
    <select intotemp='${mTmpTableCapuntes}'>
        <columns>
            capuntes.apteid, 
            MAX(cefectos.fecven) fecven 
        </columns>
        <from table='capuntes'>
            <join type='left' table="cefectos">
                <on>capuntes.apteid = cefectos.apteid</on>
            </join>
        </from>
        <where>
            capuntes.fecha   BETWEEN ? AND ?
        </where>
        <group>1</group> 
    </select>
`, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);


// ===============================================================
// Generación del ResultSet para el PLE 6
// ===============================================================
var mRsPle6 = Ax.db.executeQuery(` 
    <select>
        <columns>
            '${mStrCodPeriodo}'                     <alias name='campo1' />,

            CASE WHEN NVL(capuntes.apteid, 0) = 0 
                 THEN 'CUO'||SUBSTR(csaldos.cuenta, 1, CHARINDEX('.', csaldos.cuenta)-1)||csaldos.seccio||csaldos.proyec
                 ELSE 'CUO'||capuntes.apteid
            END                  <alias name='campo2' />,

            CAST('MCUO${mStrCodPeriodo}' AS VARCHAR(10))                 <alias name='campo3' />,

            CASE WHEN CHARINDEX('.', csaldos.cuenta) &gt; 0
                 THEN SUBSTR(csaldos.cuenta, 1, CHARINDEX('.', csaldos.cuenta)-1) || SUBSTR(csaldos.cuenta, CHARINDEX('.', csaldos.cuenta)+1)
                ELSE csaldos.cuenta
            END                                                 <alias name='campo4'/>,
                
            csaldos.proyec                                      <alias name='campo5'/>,
            csaldos.seccio                                      <alias name='campo6'/>,
            csaldos.moneda                                      <alias name='campo7'/>,

            CASE WHEN NVL(ctax_move_head.taxh_cifter, '0') = '0' THEN ''
                ELSE '6'
            END <alias name='campo8'/>,
                
            ctax_move_head.taxh_cifter <alias name='campo9'/>,

            <!-- Test -->
            NVL(ctax_move_head.taxh_auxchr4, '00')      <alias name='campo10'/>, 

            SUBSTR(ctax_move_head.taxh_refter, 1, CHARINDEX('-', ctax_move_head.taxh_refter)-1)     <alias name='campo11' />,

            <!-- Test -->
            CASE WHEN NVL(ctax_move_head.taxh_refter, '0') = '0'  THEN 'NC00123'
                 WHEN LEN(SUBSTR(ctax_move_head.taxh_refter, CHARINDEX('-', ctax_move_head.taxh_refter)+1)) &gt; 8
                    THEN ( 
                        SUBSTR(
                            SUBSTR(docser, CHARINDEX('-', docser)+1), 
                            LEN(SUBSTR(docser, CHARINDEX('-', docser)+1))-7
                        )
                     )
                    
                ELSE SUBSTR(ctax_move_head.taxh_refter, CHARINDEX('-', ctax_move_head.taxh_refter)+1)
            END <alias name='campo12' />,

            <!-- CAST(
                SUBSTR(ctax_move_head.taxh_refter, CHARINDEX('-', ctax_move_head.taxh_refter)+1)
                AS VARCHAR(20)
            )                                                       <alias name='campo12' />, -->
            

            TO_CHAR(capuntes.fecha, '%d/%m/%Y')        <alias name='campo13' />,

            TO_CHAR(tmp_cefectos.fecven, '%d/%m/%Y')        <alias name='campo14' />,

            <!-- Temporal -->
            CASE WHEN NVL(ctax_move_head.taxh_fecdoc, 0) = 0 THEN '28/02/2022'
                ELSE TO_CHAR(ctax_move_head.taxh_fecdoc, '%d/%m/%Y')
            END <alias name='campo15' />,
            <!-- CAST(TO_CHAR(ctax_move_head.taxh_fecdoc, '%d/%m/%Y') AS VARCHAR(10) )        <alias name='campo15' />, -->

            <!-- Temporal -->
            CAST(
                CASE WHEN NVL(capuntes.concep, '0') = '0' THEN ('Glosa para autocompletar las faltantes')
                    WHEN CHARINDEX('|°', capuntes.concep) &gt; 0 THEN REPLACE(capuntes.concep, '|°', '1°')
                    WHEN CHARINDEX('|', capuntes.concep) &gt; 0 THEN REPLACE(capuntes.concep, '|', '')
                    WHEN CHARINDEX(CHR(10), capuntes.concep) &gt; 0 THEN REPLACE(capuntes.concep, CHR(10), '')
                    ELSE capuntes.concep
                END 
                AS VARCHAR(200)
            )                                                               <alias name='campo16' />,

            <!-- CAST(capuntes.concep AS VARCHAR(200))                   <alias name='campo16' />, -->

            ''                                                      <alias name='campo17' />,

            NVL(capuntes.debe, 0)                               <alias name='campo18' />,
            <!-- CAST(ROUND(capuntes.debe, 2) AS VARCHAR(15))            <alias name='campo18' />, -->

            NVL(capuntes.haber, 0) <alias name='campo19' />,
            <!-- CAST(ROUND(capuntes.haber, 2) AS VARCHAR(15))           <alias name='campo19' />, -->

            ''                                                      <alias name='campo20' />,
            '1'                                                      <alias name='campo21' />,
            
            <whitespace/>
        </columns>
        <from table='csaldos'>
            <join type='left' table="capuntes">

                <on>csaldos.empcode = capuntes.empcode</on>
                <on>csaldos.cuenta  = capuntes.cuenta</on>
                <on>csaldos.codaux  = NVL(capuntes.codaux, 0)</on>
                <on>csaldos.ctaaux  = NVL(capuntes.ctaaux, 0)</on>
                <on>csaldos.moneda  = capuntes.moneda</on>
                <on>csaldos.proyec  = capuntes.proyec</on>
                <on>csaldos.seccio  = capuntes.seccio</on>
                <on>csaldos.sistem  = capuntes.sistem</on>
                <on>capuntes.fecha   BETWEEN ? AND ?</on>

                <join table='${mTmpTableCapuntes}' alias='tmp_cefectos'>
                    <on> capuntes.apteid = tmp_cefectos.apteid</on>
                </join>

                <join type='left' table="ctax_move_head">
                    <on>capuntes.apteid = ctax_move_head.taxh_apteid</on>
                </join>

            </join>
        </from>
        <where>
            csaldos.ejerci = ?
            AND csaldos.period = ?
        </where> 
    </select>
    `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mIntYear, mIntMonth).toMemory(); 

/**
 * TODO: Validar la existencia de capuntes.apteid y los campos que se requieran
 */
var mArrayCodCuentas = [];

// mRsPle6.forEach(item => {
//     if(item.campo2.length < 3){
//         mArrayCodCuentas.push(item.campo2);
//     }
// });



// ===============================================================
// Variables del nombre del archivo
// ===============================================================
var mStrRuc             = '20100121809';
var mStrYear            = mIntYear;
var mStrMonth           = (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth);
var mIntIndOperacionO   = 1;
var mIntContLibroI      = 1;
var mIntMonedaM         = 1; 

// ===============================================================
// Estructura de nombre del archivo txt de salida: 
// LE RRRRRRRRRRR AAAA MM 0006010000OIM1.TXT
// ===============================================================

// LE                  RRRRRRRRRRR    AAAA         MM       0006010000           O                  I              M          1.txt
var mStrNameFile = 'LE' + mStrRuc + mStrYear + mStrMonth + '0006010000' + mIntIndOperacionO + mIntContLibroI + mIntMonedaM + '1.txt'; 

// ===============================================================
// Si la condición del reporte es Fichero (F)
// ===============================================================
if (mStrCondicion == 'F') { 
    if (mArrayCodCuentas.length > 0) {
        throw new Ax.ext.Exception(`El/los códigos de Cuentas Contables, deben tener entre 3 y 24 dígitos: [${mArrayCodCuentas}]`);
    }

    // ===============================================================
    // Definición del blob
    // ===============================================================
    var mBlob = new Ax.sql.Blob(mStrNameFile); 

    // ===============================================================
    // Definición del archivo txt
    // ===============================================================
    new Ax.rs.Writer(mRsPle6).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(mBlob);
    }); 

    mRsPle6.close();

    // ===============================================================
    // Definición de file zip
    // ===============================================================
    var mFicheroZip  = new Ax.io.File("/tmp/ziptest.zip");
    var mZip         = new Ax.util.zip.Zip(mFicheroZip); 

    mZip.zipFile(mBlob);
    mZip.close(); 

    // ===============================================================
    // Definición blob del archivo zip
    // ===============================================================
    var mDestino    = new Ax.io.File(mFicheroZip.getAbsolutePath()); 
    var mFichero    = new Ax.sql.Blob(mDestino); 

    // ===============================================================
    // Definición ResultSet temporal
    // ===============================================================
    var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["nombre", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    }); 
    mRsFile.rows().add([mStrNameFile, mFichero.getBytes()]);

    return mRsFile; 
    
    // ===============================================================
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if (mStrCondicion == 'I') {
    return mRsPle6;
}


/*

-- SELECT REPLACE(concep, CHR(10), ''), concep, * FROM capuntes WHERE apteid = 3065184;
-- CHARINDEX(CHR(10), concep)

-- SELECT SUBSTR(docser, CHARINDEX('-', docser)+1), docser, * FROM capuntes WHERE apteid = 461457;

-- SELECT 
--     SUBSTR(
--         SUBSTR(docser, CHARINDEX('-', docser)+1), 
--         LEN(SUBSTR(docser, CHARINDEX('-', docser)+1))-7
--     ), 
--     LEN(docser), 
--     SUBSTR(docser, CHARINDEX('-', docser)+1), * 
-- FROM capuntes WHERE apteid = 461457;

-- SELECT RIGHT('000123456789', 8), SUBSTR(docser, CHARINDEX('-', docser)+1) AS nomb, * FROM capuntes WHERE apteid = 461457;

SELECT RIGHT(docser, 15), LEN(docser), SUBSTR(docser, CHARINDEX('-', docser)+1) AS nomb, * FROM capuntes WHERE apteid = 8292;

SELECT SUBSTR('1234567890', -5, LEN('1234567890')), SUBSTR(docser, CHARINDEX('-', docser)+1), * FROM capuntes WHERE apteid = 461457;

-- 23456789
-- capuntes

*/