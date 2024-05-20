
    /**
     * Name: pe_sunat_ple03_9_rep
     */
    
    // ===============================================================
    // Tipo de reporte y año/mes del periodo informado.
    // =============================================================== 
    var pStrCondicion   = 'I';
    var mIntYear        = 2024;
    var mIntMonth       = 3;

    // var mFecIni = Ax.context.variable.FECINI;
    // var mFecFin = Ax.context.variable.FECFIN;

    var mFecIni = new Ax.util.Date('01-03-2024');
    var mFecFin = new Ax.util.Date('31-03-2024');
    
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
                AND (capuntes.cuenta LIKE '34%')
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
                TO_CHAR(capuntes.fecha, '%Y%m%d')                                                                           <alias name='period' />,                    <!-- Campo 01 -->
                LPAD(capuntes.asient,9,'0')||'.'||capuntes.orden                                                            <alias name='cuo' />,                       <!-- Campo 02 -->
                CASE WHEN capuntes.period = 0 AND capuntes.origen = 'A' THEN 'A'||LPAD(capuntes.asient,9,'0')
                        WHEN capuntes.period = 99 THEN 'C'||LPAD(capuntes.asient,9,'0')
                        ELSE 'M'||LPAD(capuntes.asient,9,'0')
                END                                                                                                         <alias name='corr_asient' />,               <!-- Campo 03 -->
                CASE WHEN NVL(ctercero.ciftyp, -1) != -1 THEN ctercero.ciftyp
                    ELSE 0
                END                                                                                                         <alias name='tip_doc_emisor' />,            <!-- Campo 04 -->
                REPLACE(REPLACE(
                    CASE WHEN NVL(ctercero.cif, '-1') != '-1' THEN ctercero.cif
                         ELSE '00000000'
                    END
                , ' ', ''), '-', '')                                                                                        <alias name='num_doc_emisor' />,            <!-- Campo 05 -->
                CASE WHEN NVL(ctercero.nombre, '-1') != '-1' THEN ctercero.nombre
                     WHEN NVL(cctaauxl.desval, '-1') != '-1' THEN cctaauxl.desval
                     ELSE capuntes.concep
                END                                                                                                         <alias name='nombre_emisor' />,             <!-- Campo 06 -->
                '99'                                                                                                        <alias name='codigo_titulo' />,             <!-- Campo 07 -->
                '0.00'                                                                                                      <alias name='val_unit_titulo' />,           <!-- Campo 08 -->
                '0'                                                                                                         <alias name='cant_titulo' />,               <!-- Campo 09 -->
                (capuntes.debe - capuntes.haber)                                                                            <alias name='cost_total_titulo' />,         <!-- Campo 10 -->
                '0.00'                                                                                                      <alias name='provision_total_titulo' />,    <!-- Campo 11 -->
                '1'                                                                                                         <alias name='estado_operacion' />,          <!-- Campo 12 -->
                <whitespace/>
            </columns>
            <from table="${mTmpCapuntes}" alias="t">
                
                <join table="capuntes">
                    <on>t.apteid  = capuntes.apteid</on>
    
                    <join type='left' table='ctercero'>
                        <on>capuntes.ctaaux = ctercero.codigo</on>
                    </join>
                    <join type="left" table="cctaauxl">
                        <on>capuntes.codaux = cctaauxl.codaux</on>
                        <on>capuntes.ctaaux = cctaauxl.ctaaux</on>
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
