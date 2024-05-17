/**
     * Name: pe_sunat_ple03_3_rep
     */
    
    // ===============================================================
    // Tipo de reporte y año/mes del periodo informado.
    // =============================================================== 
    var pStrCondicion   = Ax.context.variable.TIPO;
    var mIntYear        = parseInt(Ax.context.variable.YEAR);
    var mIntMonth       = parseInt(Ax.context.variable.MONTH);
    
    var mFecIni = Ax.context.variable.FECINI;
    var mFecFin = Ax.context.variable.FECFIN;
    
    // ===============================================================
    // Construcción de la primera y ultima fecha del mes,
    // correspondiente al periodo informado
    // ===============================================================
    var mDateTimeIniPeriod = new Ax.util.Date(mFecIni);
    var mDateTimeFinPeriod = new Ax.util.Date(mFecFin).addDay(1);
    
    // ===============================================================
    // Concatenación del identificador del periodo para el
    // reporte de SUNAT
    // ===============================================================
    var mStrCodPeriodo = mIntYear.toString() + (mIntMonth < 10 ? '0'+mIntMonth : mIntMonth) + '00';
    
    
    /** ------- */
    
    var mTmpCapuntes = Ax.db.getTempTableName("tmp_capuntes");
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpCapuntes}`);
    
    /**
     * Se usa la tabla temporal tmp_capuntes para, a partir de ahí
     * obtener información de los saldos vivos
     */
    Ax.db.execute(`
        <select intotemp='${mTmpCapuntes}'>
            <columns>
                apteid, empcode, placon, cuenta, proyec,
                seccio, sistem, debe, haber
            </columns>
            <from table='capuntes' />
            <where>
                capuntes.empcode = '125'
                AND capuntes.sistem = 'A'
                AND (capuntes.cuenta LIKE '16%' OR capuntes.cuenta LIKE '17%')
                AND capuntes.fecha &gt;= ?
                AND capuntes.fecha &lt; ?
            </where>
        </select>
    `, mDateTimeIniPeriod, mDateTimeFinPeriod);
    
    Ax.db.execute(`
        CREATE INDEX i_${mTmpCapuntes}1 ON ${mTmpCapuntes}(empcode, cuenta, proyec, seccio, sistem, debe, haber);
    `);
        
    var mRsSalvivo = Ax.db.executeQuery(`
        <select>
            <columns>
                *
            </columns>
            <from table='${mTmpCapuntes}' />
            <order>
                empcode, cuenta, proyec, seccio
            </order>
        </select>
    `).toMemory();
    
    var apteidCancel = [0];
    
    for (var mRowSalvivo of mRsSalvivo) {
    
        /**
         *  Debemos reseleccionar el estado ya que si se ha modificado el registro
         *  desde dentro del cursor, este no se entera ya que tiene los valores
         *  precargados.
         */
        if (apteidCancel.includes(mRowSalvivo.apteid)) {
            continue;
        } 
    
        /**
         *  Buscar el primer registro de la tabla cuyo importe cancele el
         *  del apunte actual y marca los dos como conciliados (autocancelados)
         */
        var mRsCancelApteid = Ax.db.executeGet(`
            <select first='1'>
                <columns>
                    apteid
                </columns>
                <from table='${mTmpCapuntes}' />
                <where>
                    empcode  = ?   AND
                    proyec   = ?   AND
                    seccio   = ?   AND
                    sistem   = ?   AND
                    cuenta   = ?   AND
                    haber    = ?   AND
                    debe     = ?   AND
                    apteid NOT IN (${apteidCancel.join(',')})
                </where>
            </select>
        `, mRowSalvivo.empcode, mRowSalvivo.proyec, mRowSalvivo.seccio,
            mRowSalvivo.sistem,  mRowSalvivo.cuenta,
            mRowSalvivo.debe,    mRowSalvivo.haber);
        
        if (mRsCancelApteid) {
            apteidCancel.push(mRsCancelApteid); 
            apteidCancel.push(mRowSalvivo.apteid); 
        }
    }
    
    var mRsCapuntes = Ax.db.executeQuery(`
        <select oracle='ansi'>
            <columns>
                TO_CHAR(capuntes.fecha, '%Y%m%d')                                                                   <alias name='period' />,            <!-- Campo 01 -->
                LPAD(capuntes.asient,9,'0')||'.'||capuntes.orden                                                    <alias name='cuo' />,               <!-- Campo 02 -->
                CASE WHEN capuntes.period = 0 AND capuntes.origen = 'A' THEN 'A'||LPAD(capuntes.asient,9,'0')
                        WHEN capuntes.period = 99 THEN 'C'||LPAD(capuntes.asient,9,'0')
                        ELSE 'M'||LPAD(capuntes.asient,9,'0')
                END                                                                                                 <alias name='corr_asient' />,       <!-- Campo 03 -->
                CASE WHEN NVL(gvenfach.ciftyp, -1) != -1 THEN gvenfach.ciftyp
                     WHEN NVL(cvenfach.ciftyp, -1) != -1 THEN cvenfach.ciftyp
                     WHEN NVL(ter_gcomalb.ciftyp, -1) != -1 THEN ter_gcomalb.ciftyp
                     WHEN NVL(gcomfach.ciftyp, -1) != -1 THEN gcomfach.ciftyp
                     ELSE 0
                END                                                                                                 <alias name='tip_doc_tercero' />,  <!-- Campo 04 -->
                REPLACE(REPLACE(
                    CASE WHEN NVL(gvenfach.cif, '-1') != '-1' THEN gvenfach.cif
                         WHEN NVL(cvenfach.cif, '-1') != '-1' THEN cvenfach.cif
                         WHEN NVL(ter_gcomalb.cif, '-1') != '-1' THEN ter_gcomalb.cif
                         WHEN NVL(gcomfach.cif, '-1') != '-1' THEN gcomfach.cif
                         ELSE '00000000'
                    END
                , ' ', ''), '-', '')                                                                                <alias name='num_doc_tercero' />,  <!-- Campo 05 -->
                CASE WHEN NVL(ter_gvenfac.nombre, '-1') != '-1' THEN ter_gvenfac.nombre
                     WHEN NVL(ter_cvenfac.nombre, '-1') != '-1' THEN ter_cvenfac.nombre
                     WHEN NVL(ter_gcomalb.nombre, '-1') != '-1' THEN ter_gcomalb.nombre
                     WHEN NVL(ter_gcomfac.nombre, '-1') != '-1' THEN ter_gcomfac.nombre
                     ELSE capuntes.concep
                END                                                                                                 <alias name='nombre_tercero' />,   <!-- Campo 06 -->
                TO_CHAR(capuntes.fecha, '%d/%m/%Y')                                                                                      <alias name='fecha_operacion' />,   <!-- Campo 07 -->
                capuntes.debe - capuntes.haber                                                                      <alias name='monto' />,                <!-- Campo 08 -->
                '1'                                                                                                 <alias name='estado_operacion' />,      <!-- Campo 08 -->
                <whitespace/>,
                cenllote.tabname
            </columns>
            <from table="${mTmpCapuntes}" alias="t">
                
                <join type="left" table="capuntes">
                    <on>t.apteid  = capuntes.apteid</on>
    
                    <join type='left' table='gvenfach'>
                        <on>gvenfach.loteid = capuntes.loteid</on>
                        <join type='left' table='ctercero' alias='ter_gvenfac'>
                            <on>gvenfach.tercer = ter_gvenfac.codigo</on>
                        </join>
                    </join>
    
                    <join type='left' table='cvenfach'>
                        <on>cvenfach.loteid = capuntes.loteid</on>
                        <join type='left' table='ctercero' alias='ter_cvenfac'>
                            <on>cvenfach.tercer = ter_cvenfac.codigo</on>
                        </join>
                    </join>
    
                    <join type='left' table='gcomalbh'>
                        <on>gcomalbh.loteid = capuntes.loteid</on>
                        <join type='left' table='ctercero' alias='ter_gcomalb'>
                            <on>gcomalbh.tercer = ter_gcomalb.codigo</on>
                        </join>
                    </join>
    
                    <join type='left' table='gcomfach'>
                        <on>gcomfach.loteid = capuntes.loteid</on>
                        <join type='left' table='ctercero' alias='ter_gcomfac'>
                            <on>gcomfach.tercer = ter_gcomfac.codigo</on>
                        </join>
                    </join>
    
                    <join type="left" table="cenllote">
                        <on>capuntes.loteid = cenllote.loteid</on>
                    </join>
                </join>
            </from>
            <where>
                t.apteid NOT IN (${apteidCancel.join(',')})
            </where>
            <order>
                capuntes.asient, capuntes.orden
            </order>
        </select>
    `);
    
    /** ------- */
        
        
        
    
    // ===============================================================
    // Variables para el nombre del archivo
    // ===============================================================
    var mStrRuc             = '20100121809';
    var mStrYear            = mIntYear;
    var mStrMonth           = mIntMonth < 10 ? '0'+mIntMonth : mIntMonth;
    var mStrDay             = mFecFin.getDate() < 10 ? '0'+mFecFin.getDate() : mFecFin.getDate();
    var mIntIndOperacion    = 1;
    var mIntContLibro       = 1;
    var mIntMoneda          = 1;
    
    // ===============================================================
    // Estructura de nombre del archivo .txt de salida:
    // LERRRRRRRRRRRAAAAMMDD030200CCOIM1.TXT
    // ===============================================================
    var mStrFileName = 'LE' + mStrRuc + mStrYear + mStrMonth + mStrDay + '03050007'+ mIntIndOperacion + mIntContLibro + mIntMoneda + '1.txt';
    
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