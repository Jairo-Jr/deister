/**
 * Name: pe_sunat_ple07_3_rep
 */

// ===============================================================
// Tipo de reporte y periodo informado
// ===============================================================
var pStrCondicion = Ax.context.variable.TIPO;
var mIntYear = Ax.context.variable.YEAR;

// ===============================================================
// Definición del Periodo actual
// ===============================================================
var mDateToday = new Ax.util.Date(); 
var mYearToday = mDateToday.getYear()

var mCambioUSD = 0.00;
var mCambioEUR = 0.00;

var mArrayTipCambio = Ax.db.executeQuery(`
    <select>
        <columns>
            ccambios.moneda,
            ccambios.cambio
        </columns>
        <from table='ccambios'/>
        <where>
            tipcam = 'D'
            AND monori = 'PEN'
            AND fecha = '31-12-${mIntYear}'
        </where>
    </select>
`).toJSONArray();

mArrayTipCambio.forEach(mObjTipCambio => {
    
    if (mObjTipCambio.moneda == 'USD') {
        mCambioUSD = mObjTipCambio.cambio;
    }
    if (mObjTipCambio.moneda == 'EUR') {
        mCambioEUR = mObjTipCambio.cambio;
    }
});
console.log(mCambioUSD, mCambioEUR);
/* TABLA TEMPORAL PARA ACTIVOS FIJOS */
let mTmpTableActivos = Ax.db.getTempTableName(`tmp_cinmelem_activos_fijos`);
Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTableActivos}`);

Ax.db.execute(`
    <select intotemp='${mTmpTableActivos}' >
        <columns>
            cinmelem.empcode, 
            cinmelem.codinm, 
            cinmelem.codele,
            cinmcomp.divisa,
            MAX(cinmcomp.fecha) fecha,

            SUM( CASE WHEN cinmhead.estcom = 'A' AND cinmcomp.tipcom NOT IN ('I', 'A') 
                    THEN cinmamor.import 
                    ELSE 0.00 
                END ) <alias name='import_3' />,

            SUM( CASE WHEN cinmcomp.fecbaj IS NOT NULL
                    THEN cinmamor.import 
                    ELSE 0.00 
                END ) <alias name='import_2' />,

            SUM( CASE WHEN cinmhead.estcom = 'A' AND cinmcomp.tipcom IN ('I', 'A')
                    THEN cinmamor.import 
                    ELSE 0.00 
                END ) <alias name='import' />,

            SUM( NVL(cinmcomp.impfac, 0.00) ) <alias name='imp_usd' />,

            MAX( NVL(cinmcomp.cambio, 0.00) ) <alias name='tip_cambio' />,

            SUM( NVL((cinmcomp.impfac * cinmcomp.cambio), 0.00) ) <alias name='imp_pen' />,

            SUM( CASE WHEN cinmcomp.divisa = 'USD'
                        THEN NVL((cinmcomp.impfac * cinmcomp.cambio - cinmcomp.impfac * ${mCambioUSD}), 0.00)
                        WHEN cinmcomp.divisa = 'EUR'
                        THEN NVL((cinmcomp.impfac * cinmcomp.cambio - cinmcomp.impfac * ${mCambioEUR}), 0.00)
                    ELSE 0.00
                END ) <alias name='ajuste' />

        </columns>
        <from table='cinmelem'>
            <join table='cinmcomp'>
                <on>cinmelem.empcode = cinmcomp.empcode</on>
                <on>cinmelem.codinm = cinmcomp.codinm</on>
                <on>cinmelem.codele = cinmcomp.codele</on>

                <join table='cinmhead'>
                    <on>cinmcomp.empcode = cinmhead.empcode</on>
                    <on>cinmcomp.codinm  = cinmhead.codinm</on>
                </join>

                <join type='left' table='cinmamor'>
                    <on>cinmcomp.empcode = cinmamor.empcode</on>
                    <on>cinmcomp.codinm = cinmamor.codinm</on>
                    <on>cinmcomp.codele = cinmamor.codele</on>
                    <on>cinmcomp.codcom = cinmamor.codcom</on>
                    <on>cinmcomp.numhis = cinmamor.numhis</on>
                </join>

                <!-- <join type='left' table='gcomfach'>
                    <on>gcomfach.cabid IN (SELECT gcomfacl.cabid FROM cinmcomp_orig, gcomfacl WHERE gcomfacl.linid = cinmcomp_orig.docid AND cinmcomp_orig.seqno = cinmcomp.seqno AND cinmcomp_orig.tabori = 'gcomfacl')</on>
                </join> -->

                <!-- <join type='left' table='cinmcomp_orig'>
                    <on>cinmcomp.seqno = cinmcomp_orig.seqno</on>

                    <join table='gcomfacl'>
                        <on>cinmcomp_orig.docid = gcomfacl.linid</on>

                        <join table='gcomfach'>
                            <on>gcomfacl.cabid = gcomfach.cabid</on>
                        </join>
                    </join>
                </join> -->

            </join>
        </from>
        <where>
            <!-- cinmcomp.fecha BETWEEN ? AND ? -->
            cinmcomp.fecha BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
            AND cinmamor.fecfin BETWEEN '01-01-${mIntYear}' AND '31-12-${mIntYear}'
            AND cinmcomp.divisa != 'PEN'
        </where>
        <group>1, 2, 3, 4</group>
    </select>
`);

var mRsPle7_3 = Ax.db.executeQuery(` 
    <select>
        <columns>
            '${mIntYear}0000'   <alias name='campo1' />,
            'CUO0001'           <alias name='campo2' />,
            'MCUO0001'          <alias name='campo3' />,
            9                   <alias name='campo4' />,
            cinmelem.codele     <alias name='campo5' />,
            TO_CHAR(${mTmpTableActivos}.fecha, '%d/%m/%Y')                                  <alias name='campo6' />,
            CAST(ROUND(${mTmpTableActivos}.imp_usd, 2) AS VARCHAR(15))                      <alias name='campo7' />,
            CAST(ROUND(${mTmpTableActivos}.tip_cambio, 3) AS VARCHAR(5))                    <alias name='campo8' />,
            CAST(ROUND(${mTmpTableActivos}.imp_pen, 2) AS VARCHAR(15))                      <alias name='campo9' />,

            NVL( CAST(ROUND(
                    CASE WHEN ${mTmpTableActivos}.divisa = 'USD'
                            THEN NVL((${mCambioUSD}), 0.00)
                        WHEN ${mTmpTableActivos}.divisa = 'EUR'
                            THEN NVL((${mCambioEUR}), 0.00)
                        ELSE 0.00
                    END
                , 3) AS VARCHAR(5)) , '0.000')                 <alias name='campo10' />,

            CAST(ROUND(${mTmpTableActivos}.ajuste, 2) AS VARCHAR(15))                       <alias name='campo11' />,
            NVL( CAST(ROUND(${mTmpTableActivos}.import, 2) AS VARCHAR(15)) , '0.00')        <alias name='campo12' />,
            NVL( CAST(ROUND(${mTmpTableActivos}.import_2, 2) AS VARCHAR(15)) , '0.00')      <alias name='campo13' />,
            NVL( CAST(ROUND(${mTmpTableActivos}.import_3, 2) AS VARCHAR(15)) , '0.00')      <alias name='campo14' />, 

            CASE WHEN (${mIntYear} = ${mYearToday}) 
                    THEN '1'
                WHEN (${mIntYear} &lt; ${mYearToday}) 
                    THEN '8'
                ELSE '9'
            END <alias name='campo15' />,

            <whitespace/>
        </columns>
        <from table='cinmelem'>
            <join table='${mTmpTableActivos}'>
                <on>cinmelem.empcode = ${mTmpTableActivos}.empcode</on>
                <on>cinmelem.codinm  = ${mTmpTableActivos}.codinm</on>
                <on>cinmelem.codele  = ${mTmpTableActivos}.codele</on>
            </join>
            <join table='cinmeval'>
                <on>cinmelem.empcode = cinmeval.empcode</on>
                <on>cinmelem.codinm  = cinmeval.codinm</on>
                <on>cinmelem.codele  = cinmeval.codele</on>
            </join>
        </from>
        <where>
            1=1
        </where>
    </select>
`); 

// Variables del nombre del archivo
var mStrRuc             = '20100121809';
var mStrYear            = mIntYear;
var mIntIndOperacion    = 1;
var mIntContLibro       = 1;
var mIntMoneda          = 1;

// Estructura de nombre del archivo txt de salida: LERRRRRRRRRRRAAAA000007030000OIM1.txt
var mStrNameFile = 'LE' + mStrRuc + mStrYear + '000007030000' + mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

// Si la condición del reporte es Fichero (F)
if (pStrCondicion == 'F') { 

    // Definición del blob
    var blob = new Ax.sql.Blob(mStrNameFile);

    // Definición del archivo txt
    new Ax.rs.Writer(mRsPle7_3).csv(options => {
        options.setHeader(false);
        options.setDelimiter("|");
        options.setResource(blob);
    }); 

    // Definición de file zip
    var ficherozip = new Ax.io.File("/tmp/ziptest.zip");
    var zip = new Ax.util.zip.Zip(ficherozip); 

    zip.zipFile(blob);
    zip.close(); 

    // Definición blob del archivo zip
    var dst = new Ax.io.File(ficherozip.getAbsolutePath()); 
    var fichero = new Ax.sql.Blob(dst);

    // Definición ResultSet temporal
    var mRsFile = new Ax.rs.Reader().memory(options => {
        options.setColumnNames(["nombre", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    }); 
    mRsFile.rows().add([mStrNameFile, fichero.getBytes()]);

    return mRsFile;

    // Si la condición del reporte es Informe (I)
} else if (pStrCondicion == 'I') {
    return mRsPle7_3;
}