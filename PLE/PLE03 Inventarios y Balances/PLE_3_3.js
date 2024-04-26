/**
 * Name: pe_sunat_ple03_3_rep
 */

    // ===============================================================
    // Tipo de reporte y año/mes del periodo informado.
    // ===============================================================
var pStrCondicion   = Ax.context.variable.TIPO;
var mIntYear        = parseInt(Ax.context.variable.YEAR);
var mIntMonth       = parseInt(Ax.context.variable.MONTH);

// ===============================================================
// Construcción de la primera y ultima fecha del mes,
// correspondiente al periodo informado
// ===============================================================
if(pStrCondicion == 'I') {
    var mDateTimeIniPeriodoInf = new Ax.util.Date(Ax.context.variable.FECINI);
    var mDateTimeFinPeriodoInf = new Ax.util.Date(Ax.context.variable.FECFIN).addDay(1);
} else {
    var mDateTimeIniPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth, 1);
    var mDateTimeFinPeriodoInf = new Ax.util.Date(mIntYear, mIntMonth + 1, 1);
}

// ===============================================================
// Concatenación del identificador del periodo para el
// reporte de SUNAT
// ===============================================================
var mStrCodPeriodo = mIntYear.toString() + (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth) + '00';

var mRsCapuntes = Ax.db.executeQuery(`
                <union type='all'>
                    <!-- APUNTES ASOCIADOS A UNA FACTURA DE COMPRA -->
                    <select>
                        <columns>
                            TO_CHAR(capuntes.fecha, '%Y%m%d')                                                                   <alias name='period' />,        <!-- Campo 01 -->
                            LPAD(capuntes.asient,9,'0')||'.'||capuntes.orden                                                    <alias name='cuo' />,           <!-- Campo 02 -->
                            CASE WHEN capuntes.period = 0 AND capuntes.origen = 'A' THEN 'A'||LPAD(capuntes.asient,9,'0')
                                    WHEN capuntes.period = 99 THEN 'C'||LPAD(capuntes.asient,9,'0')
                                    ELSE 'M'||LPAD(capuntes.asient,9,'0')
                            END                                                                                                 <alias name='corr_asient' />,   <!-- Campo 03 -->
                            CASE WHEN NVL(gcomfach.ciftyp, ctercero.ciftyp) IN (2,3) THEN '0'
                                WHEN NVL(gcomfach.ciftyp, ctercero.ciftyp) = 8 THEN 'A'
                                ELSE NVL(gcomfach.ciftyp, ctercero.ciftyp)::CHAR(1)
                            END                                                                                                 <alias name='tip_doc_cliente' />,            <!-- Campo 04 -->
                            REPLACE(REPLACE(
                                NVL(gcomfach.cif,ctercero.cif)
                            , ' ', ''), '-', '')                                                                                <alias name='num_doc_cliente' />,            <!-- Campo 05 -->
                
                            ctercero.nombre                                                                                                 <alias name='nombre_cliente' />,  <!-- Campo 06 -->
                            gcomfach.fecha                                                                                                 <alias name='fecha_emision' />,            <!-- Campo 07 -->
                            gcomfach.imptot*gcomfach.cambio                                                                                                 <alias name='monto' />,                <!-- Campo 08 -->
                            '1'                                                                                                 <alias name='estado_operacion' />,      <!-- Campo 08 -->
                            <whitespace/>
                        </columns>
                        <from table='capuntes'>
                            <join table='gcomfach'>
                                <on>gcomfach.loteid = capuntes.loteid</on>
                                <join type='left' table='ctercero'>
                                    <on>gcomfach.tercer = ctercero.codigo</on>
                                </join>
                            </join>
                        </from>
                        <where>
                            (capuntes.cuenta LIKE '12%'
                            OR capuntes.cuenta LIKE '13%')
                            AND capuntes.empcode = '125'
                            AND capuntes.sistem = 'A'
                            AND capuntes.fecha &gt;= ?
                            AND capuntes.fecha &lt; ?
                        </where>
                    </select>
                
                    <!-- APUNTES ASOCIADOS A UNA FACTURA DE VENTA -->
                    <select >
                        <columns>
                            TO_CHAR(capuntes.fecha, '%Y%m%d')                                                                   <alias name='period' />,        <!-- Campo 01 -->
                            LPAD(capuntes.asient,9,'0')||'.'||capuntes.orden                                                    <alias name='cuo' />,           <!-- Campo 02 -->
                            CASE WHEN capuntes.period = 0 AND capuntes.origen = 'A' THEN 'A'||LPAD(capuntes.asient,9,'0')
                                    WHEN capuntes.period = 99 THEN 'C'||LPAD(capuntes.asient,9,'0')
                                    ELSE 'M'||LPAD(capuntes.asient,9,'0')
                            END                                                                                                 <alias name='corr_asient' />,   <!-- Campo 03 -->
                            CASE WHEN NVL(cvenfach.ciftyp, ctercero.ciftyp) IN (2,3) THEN '0'
                                WHEN NVL(cvenfach.ciftyp, ctercero.ciftyp) = 8 THEN 'A'
                                ELSE NVL(cvenfach.ciftyp, ctercero.ciftyp)::CHAR(1)
                            END                                                                                                 <alias name='tip_doc_cliente' />,            <!-- Campo 04 -->
                            REPLACE(REPLACE(
                                NVL(cvenfach.cif,ctercero.cif)
                            , ' ', ''), '-', '')                                                                                <alias name='num_doc_cliente' />,            <!-- Campo 05 -->
                            NVL(cvenfach.nombre, ctercero.nombre)                                                               <alias name='nombre_cliente' />,  <!-- Campo 06 -->
                            cvenfach.fecfac                                                                                     <alias name='fecha_emision' />,            <!-- Campo 07 -->
                            cvenfach.imptot*cvenfach.cambio                                                                     <alias name='monto' />,                <!-- Campo 08 -->
                            '1'                                                                                                 <alias name='estado_operacion' />,      <!-- Campo 08 -->
                            <whitespace/>
                        </columns>
                        <from table='capuntes'>
                            <join table='cvenfach'>
                                <on>cvenfach.loteid = capuntes.loteid</on>
                                <join type='left' table='ctercero'>
                                    <on>cvenfach.tercer = ctercero.codigo</on>
                                </join>
                            </join>
                        </from>
                        <where>
                            (capuntes.cuenta LIKE '12%'
                            OR capuntes.cuenta LIKE '13%')
                            AND capuntes.empcode = '125'
                            AND capuntes.sistem = 'A'
                            AND capuntes.fecha &gt;= ?
                            AND capuntes.fecha &lt; ?
                        </where>
                    </select>
                
                    <!-- APUNTES ASOCIADOS A UNA GESTION -->
                    <select >
                        <columns>
                            TO_CHAR(capuntes.fecha, '%Y%m%d')                                                                   <alias name='period' />,            <!-- Campo 01 -->
                            LPAD(capuntes.asient,9,'0')||'.'||capuntes.orden                                                    <alias name='cuo' />,               <!-- Campo 02 -->
                            CASE WHEN capuntes.period = 0 AND capuntes.origen = 'A' THEN 'A'||LPAD(capuntes.asient,9,'0')
                                    WHEN capuntes.period = 99 THEN 'C'||LPAD(capuntes.asient,9,'0')
                                    ELSE 'M'||LPAD(capuntes.asient,9,'0')
                            END                                                                                                 <alias name='corr_asient' />,       <!-- Campo 03 -->
                            CASE WHEN NVL(ctercero.ciftyp, ctercer_efect.ciftyp) IN (2,3) THEN '0'
                                WHEN NVL(ctercero.ciftyp, ctercer_efect.ciftyp) = 8 THEN 'A'
                                ELSE NVL(ctercero.ciftyp, ctercer_efect.ciftyp)::CHAR(1)
                            END                                                                                                 <alias name='tip_doc_cliente' />,   <!-- Campo 04 -->
                            REPLACE(REPLACE(
                                NVL(ctercero.cif, ctercer_efect.cif)
                            , ' ', ''), '-', '')                                                                                <alias name='num_doc_cliente' />,   <!-- Campo 05 -->
                            NVL(ctercero.nombre, ctercer_efect.nombre)                                                          <alias name='nombre_cliente' />,    <!-- Campo 06 -->
                            cefecges_pcs.pcs_fecpro                                                                             <alias name='fecha_emision' />,     <!-- Campo 07 -->
                            SUM(CASE WHEN cefectos.clase = cefecges_pcs.pcs_clase THEN +cefecges_det.det_impdiv
                                    ELSE -cefecges_det.det_impdiv
                                END)                                                                                            <alias name='monto' />,             <!-- Campo 08 -->
                            '1'                                                                                                 <alias name='estado_operacion' />,  <!-- Campo 09 -->
                            <whitespace/>
                        </columns>
                        <from table='capuntes'>
                            <join table='cefecges_pcs'>
                                <on>capuntes.loteid = cefecges_pcs.pcs_loteid</on>
                                <join type='left' table='cefecges_det'>
                                    <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                                    <join table='cefectos'>
                                        <on>cefecges_det.det_numero = cefectos.numero</on>
                                        <join type='left' table="ctercero" alias='ctercer_efect'>
                                            <on>cefectos.tercer = ctercer_efect.codigo</on>
                                        </join>
                                    </join>
                                </join>
                                <join type="left" table="ctercero">
                                    <on>cefecges_pcs.pcs_codper = ctercero.codigo</on>
                                </join>
                            </join>
                        </from>
                        <where>
                            (capuntes.cuenta LIKE '12%'
                            OR capuntes.cuenta LIKE '13%')
                            AND capuntes.empcode = '125'
                            AND capuntes.sistem = 'A'
                            AND capuntes.fecha &gt;= ?
                            AND capuntes.fecha &lt; ?
                        </where>
                        <group>1, 2, 3, 4, 5, 6, 7</group>
                    </select>
                
                    <!-- APUNTES ASOCIADOS A UNA RECLASIFICACIÓN -->
                    <select >
                        <columns>
                            TO_CHAR(capuntes.fecha, '%Y%m%d')                                                                   <alias name='period' />,            <!-- Campo 01 -->
                            LPAD(capuntes.asient,9,'0')||'.'||capuntes.orden                                                    <alias name='cuo' />,               <!-- Campo 02 -->
                            CASE WHEN capuntes.period = 0 AND capuntes.origen = 'A' THEN 'A'||LPAD(capuntes.asient,9,'0')
                                    WHEN capuntes.period = 99 THEN 'C'||LPAD(capuntes.asient,9,'0')
                                    ELSE 'M'||LPAD(capuntes.asient,9,'0')
                            END                                                                                                 <alias name='corr_asient' />,       <!-- Campo 03 -->
                            CASE WHEN NVL(ctercero.ciftyp, -1) IN (2,3) THEN '0'
                                WHEN NVL(ctercero.ciftyp, -1) = 8 THEN 'A'
                                ELSE NVL(ctercero.ciftyp, '0')::CHAR(1)
                            END                                                                                                 <alias name='tip_doc_cliente' />,   <!-- Campo 04 -->
                            REPLACE(REPLACE(
                                NVL(ctercero.cif, '00000000000')
                            , ' ', ''), '-', '')                                                                                <alias name='num_doc_cliente' />,   <!-- Campo 05 -->
                            NVL(ctercero.nombre, capuntes.concep)                                                               <alias name='nombre_cliente' />,    <!-- Campo 06 -->
                            cefecrec_pcs.pcs_fecpro                                                                             <alias name='fecha_emision' />,     <!-- Campo 07 -->
                            SUM(CASE WHEN cefectos.clase = 'C' THEN +cefectos.import
                                    ELSE -cefectos.import
                                END)                                                                                            <alias name='monto' />,             <!-- Campo 08 -->
                            '1'                                                                                                 <alias name='estado_operacion' />,  <!-- Campo 09 -->
                            <whitespace/>
                        </columns>
                        <from table='capuntes'>
                            <join table='cefecrec_pcs'>
                                <on>capuntes.loteid = cefecrec_pcs.pcs_loteid</on>
                                <join type='left' table='cefecrec_ori'>
                                    <on>cefecrec_pcs.pcs_seqno = cefecrec_ori.pcs_seqno</on>
                                    <join table='cefectos'>
                                        <on>cefecrec_ori.ori_numero = cefectos.numero</on>
                                        <on>capuntes.docser = cefectos.docser</on>
                                        <join type='left' table='ctercero'>
                                            <on>cefectos.tercer = ctercero.codigo</on>
                                        </join>
                                    </join>
                                </join>
                            </join>
                        </from>
                        <where>
                            (capuntes.cuenta LIKE '12%'
                            OR capuntes.cuenta LIKE '13%')
                            AND capuntes.empcode = '125'
                            AND capuntes.sistem = 'A'
                            AND capuntes.fecha &gt;= ?
                            AND capuntes.fecha &lt; ?
                        </where>
                        <group>1, 2, 3, 4, 5, 6, 7</group>
                    </select>
                </union>
            `, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf, mDateTimeIniPeriodoInf, mDateTimeFinPeriodoInf);

// ===============================================================
// Variables para el nombre del archivo
// ===============================================================
var mStrRuc             = '20100121809';
var mStrYear            = mIntYear;
var mStrMonth           = mIntMonth < 10 ? '0'+mIntMonth : mIntMonth;
var mStrDay             = Ax.context.variable.FECFIN.getDate() < 10 ? '0'+Ax.context.variable.FECFIN.getDate() : Ax.context.variable.FECFIN.getDate();
var mIntIndOperacion    = 1;
var mIntContLibro       = 1;
var mIntMoneda          = 1;

// ===============================================================
// Estructura de nombre del archivo .txt de salida:
// LERRRRRRRRRRRAAAAMMDD030200CCOIM1.TXT
// ===============================================================
var mStrFileName = 'LE' + mStrRuc + mStrYear + mStrMonth + mStrDay + '03020007'+ mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';

// ===============================================================
// Si la condición del reporte es Fichero (F)
// ===============================================================
if (pStrCondicion == 'F') {

    // ===============================================================
    // Definición del blob
    // ===============================================================
    var blob = new Ax.sql.Blob(mStrFileName);

    // ===============================================================
    // Definición del archivo txt
    // ===============================================================
    new Ax.rs.Writer(mRsCapuntes).csv(options => {
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
        options.setColumnNames(["nombre", "archivo"]);
        options.setColumnTypes([Ax.sql.Types.CHAR, Ax.sql.Types.BLOB]);
    });
    mRsFile.rows().add([mStrFileName, fichero.getBytes()]);

    return mRsFile;

    // ===============================================================
    // Si la condición del reporte es Informe (I)
    // ===============================================================
} else if (pStrCondicion == 'I') {
    return mRsCapuntes;
}