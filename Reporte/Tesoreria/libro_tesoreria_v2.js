

    /**
    *   ===================================================================================
    *   === 1.2 LIBRO CAJA Y BANCOS - DETALLE DE LOS MOVIMIENTOS DE LA CUENTA CORRIENTE ===
    *
    *   Field 01 Período [capuntes.period]
    *   Field 02 Código Único de la Operación (CUO)
    *   Field 03 Número correlativo del asiento contable identificado en el campo 2.
    *            Axxx apertura ejercicio
    *            Mxxx movimientos
    *            Cxxx cierre ejercicio
    *   Field 04 Código SUNAT Tabla 3 de entidad financiera de la cuenta bancaria
    *   Field 05 Fecha contable del asiento [capuntes.fecha]
    *   Field 06 Número del asiento contable [capuntes.fecha]
    *   Field 07 Fecha de vencimiento [cefectos.fecven] / [capuntes.fecval] / [taptcuen.fecope]
    *            según origen cartera. asiemntos o directamente tesorería
    *   Field 08 Mes de la fecha vencimiento hallada en Field 07
    *   Field 09 Cuenta contable [cbancpro.cuenta] de la cuenta bancaria
    *   Field 10 Descripción de la cuenta contable Field 09 [ccuentas.nombre]
    *   Field 11 Moneda SUNAT Tabla 4  [capuntes.moneda]
    *   Field 12 Fecha de operación [taptcuen.fecope]
    *   Field 13 Medio de pago, Tabla 1 SUNAT [ctipoefe.taxmed]
    *   Field 13 Descripcion del medio de pago [ctipoefe.nomefe] Es uso interno
    *   Field 15 Tipo de comprobante Tabla 10 SUNAT  [cefectos.auxnum3]
    *   Field 16 Número de serie del comprobante  [cefectos.docser]   <<SUBSTR(docser,2,3)
    *   Field 17 Número de transacción bancaria, número de documento sustentatorio o número
    *            de control interno de la operación bancaria [taptcuen.apteid]
    *   Field 18 Tipo Id. fiscal Tabla 2 SUNAT [ctercero.ciftyp] / [gclimost.ciftyp]
    *   Field 19 Número de ID. del girador o beneficiario [cterceero.cif] / [gclimost.cif]
    *   Field 20 Apellidos y nombres, Denominación o R.S.l del girador o beneficiario.
    *            Puede ser [ctercero.nombre] / [gclimost -....]
    *   Field 21 Descripción de la operación bancaria.  [toperfin.nomope]
    *   Field 22 Descripción movimiento.  [capuntes.concep]
    *   Field 23 Saldo deudor [capuntes.debe]
    *   Field 24 Saldo acreedor [capuntes.haber]
    *   Field 25 Estado de la operación           Valor fijo 1
    *            '1' corresponde al periodo.
    *            '8' corresponde a un periodo anterior y NO se anoto en el.
    *            '9' corresponde a un periodo anterior y SI se anoto en el.
    *   Field 26 Fecha de remesa / registro   [cremesas.fecrem]
    *   Field 27 Número de remesa / registro  [cremesas.fecrem]
    *   Field 28 Cobro cajas Lote de tarjeta                       Pendiente !!!
    *   Field 29 Cobro cajas Terminal tarjeta                      Pendiente !!!
    *   Field 30 Cobro cajas Id Axional                            Pendiente !!!
    *   Field 31 Cobro cajas Tipo efecto                           Pendiente !!!
    *   Field 32 Gestión Tesorería, voucher                        Pendiente !!!
    *   Field 33 Libro diario [capuntes.diario]
    *   Field 34 Codigo de conciliado [taptcuen.concid]
    *   ===================================================================================
    * */

    var mCondInput = Ax.context.property.COND;
    var mFECINI = Ax.context.variable.FECINI;
    var mFECFIN = Ax.context.variable.FECFIN;

    var mCondInput_2 = mCondInput.toString().replace('capuntes.diario', 'cefeplah.diario')
    .replace('capuntes.moneda', 'taptfluj.monflu')
    .replace('capuntes.cuenta', 'taptfluj.ctaflu');

    let mTmpTaptcuen = Ax.db.getTempTableName(`tmp_taptcuen`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpTaptcuen}`);

    Ax.db.execute(`
<union intotemp='${mTmpTaptcuen}' type='all'>

    <!-- ORIGEN EXTRACTO -->
    <select>
        <columns>
            capuntes.empcode, capuntes.ejerci,
            capuntes.period,  capuntes.loteid,
            CASE WHEN capuntes.period = 0 THEN 'A'||capuntes.jusser
            WHEN capuntes.period BETWEEN 1 AND 12 THEN 'M'||capuntes.jusser
            WHEN capuntes.period = 99 THEN 'C'||capuntes.jusser
            ELSE  'X'||capuntes.jusser
            END jusser,
            SUBSTR(cbancpro.codban,5,2) codban, capuntes.fecha,  capuntes.asient,
            NVL(capuntes.fecval,taptcuen.fecope) fecven,
            MONTH(NVL(capuntes.fecval,taptcuen.fecope)) mesval,
            capuntes.cuenta,  ccuentas.nombre nomcta,  capuntes.moneda, taptcuen.fecope,
            '' taxmed,  '' nomefe,  '' auxnum3,

            SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))) serie,

            capuntes.docser docser, taptcuen.refban, taptcuen.ctafin, taptcuen.remesa,

            taptcuen.apteid,
            ''::integer ciftyp,
            '' cif,
            '' nombre,
            toperfin.nomope,  capuntes.concep, taptfluj.impdiv, taptfluj.impflu, '1' estado,
            cremesas.fecrem,
            28 field_28,
            29 field_29,
            30 field_30,
            31 field_31,
            32 field_32,
            capuntes.diario, taptcuen.concid
        </columns>
        <from table='cbancpro'>
            <join table='cempresa'>
                <on>cbancpro.empcode = cempresa.empcode</on>
                <join table='ccuentas'>
                    <on>cempresa.placon  = ccuentas.placon</on>
                    <on>cbancpro.cuenta  = ccuentas.codigo</on>
                </join>
            </join>

            <join table='taptcuen'>
                <on>cbancpro.ctafin  = taptcuen.ctafin</on>
                <join table='toperfin'>
                    <on>taptcuen.opefin  = toperfin.opefin</on>
                </join>
                <join table='taptfluj'>
                    <on>taptcuen.apteid  = taptfluj.rowenl</on>
                </join>
                <join table='capuntes'>
                    <on>taptcuen.loteid  = capuntes.loteid</on>
                </join>
                <join type='left' table='cremesas'>
                    <on>taptcuen.remesa  = cremesas.numrem</on>
                </join>

            </join>
        </from>
        <where>
            (CASE WHEN capuntes.cuenta LIKE '40189%'
            OR capuntes.cuenta LIKE '67611%'
            OR capuntes.cuenta LIKE '77611%' THEN 0 ELSE 1 END) = 1
            AND taptfluj.numero IS NULL
            AND capuntes.cuenta LIKE '104%' AND capuntes.haber != 0
            AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
            AND ${mCondInput}
        </where>
    </select>

    <!-- ORIGEN REMESA -->
    <!-- <select>
        <columns>
            capuntes.empcode, capuntes.ejerci,
            capuntes.period,  capuntes.loteid,
            CASE WHEN capuntes.period = 0 THEN 'A'||capuntes.jusser
                WHEN capuntes.period BETWEEN 1 AND 12 THEN 'M'||capuntes.jusser
                WHEN capuntes.period = 99 THEN 'C'||capuntes.jusser
                ELSE  'X'||capuntes.jusser
            END jusser,

            MAX(SUBSTR(cbancpro.codban,5,2)) codban, MAX(capuntes.fecha) fecha,  MAX(capuntes.asient) asient,
            MAX(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope)))) fecven,
            MAX(MONTH(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope))))) mesval,
            MAX(capuntes.cuenta) cuenta,  MAX(ccuentas.nombre) nomcta,  MAX(capuntes.moneda) moneda, MAX(taptcuen.fecope) fecope,
            MAX(ctipoefe.taxmed) taxmed,  MAX(ctipoefe.nomefe) nomefe,  MAX(cefectos.auxnum3) auxnum3,

            MAX(NVL(SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1))),
            SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))))) serie,

            MAX(NVL(cefectos.docser, capuntes.docser)) docser, MAX(taptcuen.refban) refban, MAX(taptcuen.ctafin) ctafin, taptcuen.remesa,

            MAX(taptcuen.apteid) apteid,
            MAX(ctercero.ciftyp) ciftyp,
            MAX(ctercero.cif) cif,
            MAX(ctercero.nombre) nombre,
            MAX(toperfin.nomope) nomope,  MAX(cefectos.coment) concep,
            SUM(cefectos.impdiv) impdiv,
            SUM(cefectos.import) impflu,
            '1' estado,
            MAX(cremesas.fecrem) fecrem,
            28 field_28,
            29 field_29,
            30 field_30,
            31 field_31,
            32 field_32,
            MAX(capuntes.diario) diario, MAX(taptcuen.concid) concid
        </columns>
        <from table='cbancpro'>
            <join table='cempresa'>
                <on>cbancpro.empcode = cempresa.empcode</on>
                <join table='ccuentas'>
                    <on>cempresa.placon  = ccuentas.placon</on>
                    <on>cbancpro.cuenta  = ccuentas.codigo</on>
                </join>
            </join>

            <join table='taptcuen'>
                <on>cbancpro.ctafin  = taptcuen.ctafin</on>
                <join table='toperfin'>
                    <on>taptcuen.opefin  = toperfin.opefin</on>
                </join>

                <join table='cremesas'>
                    <on>cremesas.empcode = taptcuen.empcode</on>
                    <on>cremesas.numrem = taptcuen.remesa</on>

                    <join table='cefecges_pcs'>
                        <on>cremesas.numrem = cefecges_pcs.pcs_numrem</on>
                        <on>cremesas.accion = cefecges_pcs.pcs_accion</on>
                        <join table='cefecges_det'>
                            <on>cefecges_pcs.pcs_seqno = cefecges_det.pcs_seqno</on>
                            <join table='cefectos'>
                                <on>cefecges_det.det_numero = cefectos.numero</on>
                                <join table='ctipoefe'>
                                    <on>cefectos.clase  = ctipoefe.clase</on>
                                    <on>cefectos.tipefe  = ctipoefe.codigo</on>
                                </join>
                                <join table='ctercero'>
                                    <on>cefectos.codper  = ctercero.codigo</on>
                                </join>
                                <join table='capuntes'>
                                    <on>taptcuen.loteid  = capuntes.loteid</on>
                                    <on>cefectos.docser  = capuntes.docser</on>
                                </join>
                            </join>
                        </join>
                    </join>
                </join>
            </join>
        </from>
        <where>
            capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
            AND ${mCondInput}

        </where>
        <group>
            1,2,3,4,5,taptcuen.remesa,cefectos.codper
        </group>
    </select> -->

    <!-- Regitro Manual -->
    <select>
        <columns>
            capuntes.empcode, capuntes.ejerci,
            capuntes.period,  capuntes.loteid,
            CASE WHEN capuntes.period = 0 THEN 'A'||capuntes.jusser
            WHEN capuntes.period BETWEEN 1 AND 12 THEN 'M'||capuntes.jusser
            WHEN capuntes.period = 99 THEN 'C'||capuntes.jusser
            ELSE  'X'||capuntes.jusser
            END jusser,
            MAX(SUBSTR(cbancpro.codban,5,2)) codban, MAX(capuntes.fecha) fecha,  MAX(capuntes.asient) asient,
            MAX(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope)))) fecven,
            MAX(MONTH(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope))))) mesval,
            MAX(capuntes.cuenta) cuenta,  MAX(ccuentas.nombre) nomcta,  MAX(capuntes.moneda) moneda, MAX(taptcuen.fecope) fecope,
            MAX(ctipoefe.taxmed) taxmed,  MAX(ctipoefe.nomefe) nomefe,  MAX(cefectos.auxnum3) auxnum3,

            MAX(NVL(SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1))),
            SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))))) serie,

            MAX(NVL(cefectos.docser, capuntes.docser)) docser, MAX(taptcuen.refban) refban, MAX(taptcuen.ctafin) ctafin, taptcuen.remesa,

            MAX(taptcuen.apteid) apteid,
            MAX(ctercero.ciftyp) ciftyp,
            MAX(ctercero.cif) cif,
            MAX(ctercero.nombre) nombre,
            MAX(toperfin.nomope) nomope,  MAX(cefectos.coment) concep,
            SUM(taptfluj.impdiv) impdiv,
            SUM(taptfluj.impflu) impflu,
            '1' estado,
            MAX(cremesas.fecrem) fecrem,
            28 field_28,
            29 field_29,
            30 field_30,
            31 field_31,
            32 field_32,
            MAX(capuntes.diario) diario, MAX(taptcuen.concid) concid
        </columns>
        <from table='cbancpro'>
            <join table='cempresa'>
                <on>cbancpro.empcode = cempresa.empcode</on>
                <join table='ccuentas'>
                    <on>cempresa.placon  = ccuentas.placon</on>
                    <on>cbancpro.cuenta  = ccuentas.codigo</on>
                </join>
            </join>

            <join table='taptcuen'>
                <on>cbancpro.ctafin  = taptcuen.ctafin</on>
                <join table='toperfin'>
                    <on>taptcuen.opefin  = toperfin.opefin</on>
                </join>
                <join table='taptfluj'>
                    <on>taptcuen.apteid  = taptfluj.rowenl</on>
                    <join table='cefectos'>
                        <on>taptfluj.numero  = cefectos.numero</on>
                        <join table='ctipoefe'>
                            <on>cefectos.clase  = ctipoefe.clase</on>
                            <on>cefectos.tipefe  = ctipoefe.codigo</on>
                        </join>
                        <join table='ctercero'>
                            <on>cefectos.codper  = ctercero.codigo</on>
                        </join>
                        <join table='capuntes'>
                            <on>taptcuen.loteid  = capuntes.loteid</on>
                            <!-- <on>cefectos.docser  = capuntes.docser</on> -->
                        </join>
                    </join>
                </join>
                <join type='left' table='cremesas'>
                    <on>taptcuen.remesa  = cremesas.numrem</on>
                </join>

            </join>
        </from>
        <where>
            (CASE WHEN capuntes.cuenta LIKE '103%' AND capuntes.debe != 0 THEN 0
            WHEN capuntes.cuenta LIKE '103%' AND capuntes.haber != 0 AND NVL(taptcuen.concid, 0) != 0 THEN 0
            WHEN capuntes.cuenta LIKE '42%' AND NVL(taptcuen.concid, 0) != 0 THEN 0
            WHEN capuntes.cuenta LIKE '40189%'
            OR capuntes.cuenta LIKE '67611%'
            OR capuntes.cuenta LIKE '77611%' THEN 0 ELSE 1 END) = 1
            AND NVL(cefectos.auxnum3, '') != '07'
            AND cefectos.impdiv &gt;= 0
            AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
            AND ${mCondInput}

        </where>
        <group>
            1,2,3,4,5,taptcuen.remesa,cefectos.codper
        </group>
    </select>

    <!-- Capuntes de origen interfase -->
    <select>
        <columns>
            capuntes.empcode, capuntes.ejerci,
            capuntes.period,  capuntes.loteid,
            CASE WHEN capuntes.period = 0 THEN 'A'||capuntes.jusser
            WHEN capuntes.period BETWEEN 1 AND 12 THEN 'M'||capuntes.jusser
            WHEN capuntes.period = 99 THEN 'C'||capuntes.jusser
            ELSE  'X'||capuntes.jusser
            END jusser,
            SUBSTR(cbancpro.codban,5,2) codban, capuntes.fecha fecha,  capuntes.asient asient,
            capuntes.fecval fecven,
            MONTH(capuntes.fecval) mesval,
            capuntes.cuenta cuenta,  ccuentas.nombre nomcta,  capuntes.moneda moneda, ''::DATE fecope,
            '' taxmed,  '' nomefe,  '' auxnum3,

            SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))) serie,

            capuntes.docser docser, '' refban, cbancpro.ctafin ctafin, ''::INTEGER remesa,

            ''::INTEGER apteid,
            ''::INTEGER ciftyp,
            '' cif,
            '' nombre,
            '' nomope,  capuntes.concep,
            CASE WHEN capuntes.divdeb &gt; 0 THEN -capuntes.divdeb
            WHEN capuntes.divhab &gt; 0 THEN +capuntes.divhab
            ELSE 0
            END impdiv,
            CASE WHEN capuntes.debe &gt; 0 THEN -capuntes.debe
            WHEN capuntes.haber &gt; 0 THEN +capuntes.haber
            ELSE 0
            END impflu,
            '1' estado,
            ''::DATE fecrem,
            28 field_28,
            29 field_29,
            30 field_30,
            31 field_31,
            32 field_32,
            capuntes.diario diario, ''::INTEGER concid
        </columns>
        <from table='capuntes'>
            <join  table='ccuentas'>
                <on>capuntes.cuenta  = ccuentas.codigo</on>
                <on>capuntes.placon  = ccuentas.placon</on>
                <join type="left" table="cbancpro">
                    <on>ccuentas.codigo = cbancpro.cuenta</on>
                </join>
            </join>
        </from>
        <where>
            capuntes.diario IN ('27', '05')
            AND capuntes.cuenta LIKE '104%'
            AND capuntes.origen = 'MC'
            AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
            AND ${mCondInput}

        </where>
    </select>

    <!-- Mov. Tesoreria sin Apuntes -->
    <select>
        <columns>
            taptcuen.empcode, YEAR(taptcuen.fecope) ejerci,
            MONTH(taptcuen.fecope) period,  ''::INTEGER loteid,
            '' jusser,
            MAX(SUBSTR(cbancpro.codban,5,2)) codban, MAX(taptcuen.fecope) fecha,  ''::INTEGER asient,
            MAX(NVL(cefectos.fecven,(NVL(taptcuen.fecval,taptcuen.fecope)))) fecven,
            MAX(MONTH(NVL(cefectos.fecven,(NVL(taptcuen.fecval,taptcuen.fecope))))) mesval,
            MAX(taptfluj.ctaflu) cuenta,  MAX(ccuentas.nombre) nomcta,  MAX(taptfluj.monflu) moneda, MAX(taptcuen.fecope) fecope,
            MAX(ctipoefe.taxmed) taxmed,  MAX(ctipoefe.nomefe) nomefe,  MAX(cefectos.auxnum3) auxnum3,

            MAX(SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1)))) serie,

            MAX(cefectos.docser) docser, MAX(taptcuen.refban) refban, MAX(taptcuen.ctafin) ctafin, taptcuen.remesa,

            MAX(taptcuen.apteid) apteid,
            MAX(ctercero.ciftyp) ciftyp,
            MAX(ctercero.cif) cif,
            MAX(ctercero.nombre) nombre,
            MAX(toperfin.nomope) nomope,  MAX(cefectos.coment) concep,
            SUM(taptfluj.impdiv) impdiv,
            SUM(taptfluj.impflu) impflu,
            '1' estado,
            MAX(cremesas.fecrem) fecrem,
            28 field_28,
            29 field_29,
            30 field_30,
            31 field_31,
            32 field_32,
            MAX(cefeplah.diario) diario, MAX(taptcuen.concid) concid
        </columns>
        <from table='cefecges_pcs'>
            <join table='taptcuen'>
                <on>cefecges_pcs.pcs_seqno = taptcuen.gesori</on>
                <join table='taptfluj'>
                    <on>taptcuen.apteid  = taptfluj.rowenl</on>
                    <join table='cefectos'>
                        <on>taptfluj.numero  = cefectos.numero</on>
                        <join table='ctipoefe'>
                            <on>cefectos.clase  = ctipoefe.clase</on>
                            <on>cefectos.tipefe  = ctipoefe.codigo</on>
                        </join>
                        <join table='ctercero'>
                            <on>cefectos.codper  = ctercero.codigo</on>
                        </join>
                    </join>
                </join>
                <join table='cbancpro'>
                    <on>taptcuen.ctafin  = cbancpro.ctafin</on>
                    <join table='cempresa'>
                        <on>cbancpro.empcode = cempresa.empcode</on>
                        <join table='ccuentas'>
                            <on>cempresa.placon  = ccuentas.placon</on>
                            <on>cbancpro.cuenta  = ccuentas.codigo</on>
                        </join>
                    </join>
                </join>
                <join table='toperfin'>
                    <on>taptcuen.opefin  = toperfin.opefin</on>
                </join>
                <join type='left' table='cremesas'>
                    <on>taptcuen.remesa  = cremesas.numrem</on>
                </join>
            </join>
            <join type='left' table='cefeacti'>
                <on>cefecges_pcs.pcs_accion  = cefeacti.codigo</on>
                <on>cefecges_pcs.pcs_clase  = cefeacti.clase</on>
                <join table='cefeplah'>
                    <on>cefeacti.codigo  = cefeplah.codigo</on>
                    <on>cefeacti.clase  = cefeplah.clase</on>
                </join>
            </join>
        </from>
        <where>
            (CASE WHEN taptfluj.ctaflu LIKE '40189%'
            OR taptfluj.ctaflu LIKE '67611%'
            OR taptfluj.ctaflu LIKE '77611%' THEN 0 ELSE 1 END) = 1
            AND NVL(cefectos.auxnum3, '') != '07'

            AND NVL(taptcuen.loteid, 0) = 0
            AND taptcuen.fecope BETWEEN ${mFECINI} AND ${mFECFIN}

            AND ${mCondInput_2}

        </where>
        <group>
            1,2,3,4,5,taptcuen.remesa,cefectos.codper
        </group>
    </select>

</union>
    `);

    /* let mTmpCefecgesPcs = Ax.db.getTempTableName(`tmp_cefecges_pcs`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mTmpCefecgesPcs}`);

    Ax.db.execute(`
<select intotemp='${mTmpCefecgesPcs}'>
    <columns>
        pcs_seqno::VARCHAR(255) pcs_seqno,
        pcs_loteid
    </columns>
    <from table='cefecges_pcs' />
</select>
    `); */

    /*var rsTesoreria = Ax.db.executeQuery(`
<select>
    <columns>
        empcode, ejerci,
        period,  NVL(loteid, cefecges_pcs.pcs_loteid) loteid,
        jusser,
        codban, fecha, asient,
        fecven,
        mesval,
        cuenta, nomcta, moneda, fecope,
        taxmed, nomefe, auxnum3,

        serie,

        docser, refban, ctafin, fecrem, remesa,

        apteid,
        ciftyp,
        cif,
        nombre,
        nomope,  concep,
        CASE WHEN impdiv &lt; 0 THEN impdiv
        ELSE 0 END divdeb,
        CASE WHEN impdiv &gt; 0 THEN impdiv
        ELSE 0 END divhab,

        CASE WHEN impflu &lt; 0 THEN impflu
        ELSE 0 END debe,
        CASE WHEN impflu &gt; 0 THEN impflu
        ELSE 0 END haber,
        '1' estado,
        28 field_28,
        29 field_29,
        30 field_30,
        31 field_31,
        32 field_32,
        diario, concid
    </columns>
    <from table='${mTmpTaptcuen}' alias='tmp_taptcuen' >
        <join type='left' table='cefecges_pcs'>
            <on>tmp_taptcuen.refban  = cefecges_pcs.pcs_seqno::CHAR(50)</on>
        </join>
    </from>
    <order>
        1,2,3,23
    </order>
</select>

    `);*/

    var rsTesoreria = Ax.db.executeQuery(`
<select>
    <columns>
        tmp_taptcuen.empcode, tmp_taptcuen.ejerci,
        tmp_taptcuen.period,  NVL(tmp_taptcuen.loteid, cefecges_pcs.pcs_loteid) loteid,
        tmp_taptcuen.jusser,
        tmp_taptcuen.codban, tmp_taptcuen.fecha, tmp_taptcuen.asient,
        tmp_taptcuen.fecven,
        tmp_taptcuen.mesval,
        tmp_taptcuen.cuenta, tmp_taptcuen.nomcta, tmp_taptcuen.moneda, tmp_taptcuen.fecope,
        tmp_taptcuen.taxmed, tmp_taptcuen.nomefe, tmp_taptcuen.auxnum3,

        tmp_taptcuen.serie,

        tmp_taptcuen.docser, tmp_taptcuen.refban, tmp_taptcuen.ctafin, tmp_taptcuen.fecrem, cremesas.numrem || ' (' || cremesas.imptot || ')' remesa,

        tmp_taptcuen.apteid,
        tmp_taptcuen.ciftyp,
        tmp_taptcuen.cif,
        tmp_taptcuen.nombre,
        tmp_taptcuen.nomope,  tmp_taptcuen.concep,
        CASE WHEN tmp_taptcuen.impdiv &lt; 0 THEN tmp_taptcuen.impdiv
        ELSE 0 END divdeb,
        CASE WHEN tmp_taptcuen.impdiv &gt; 0 THEN tmp_taptcuen.impdiv
        ELSE 0 END divhab,

        CASE WHEN tmp_taptcuen.impflu &lt; 0 THEN tmp_taptcuen.impflu
        ELSE 0 END debe,
        CASE WHEN tmp_taptcuen.impflu &gt; 0 THEN tmp_taptcuen.impflu
        ELSE 0 END haber,
        '1' estado,
        28 field_28,
        29 field_29,
        30 field_30,
        31 field_31,
        32 field_32,
        tmp_taptcuen.diario, tmp_taptcuen.concid
    </columns>
    <from table='${mTmpTaptcuen}' alias='tmp_taptcuen' >
        <join type='left' table='cefecges_pcs'>
            <on>tmp_taptcuen.refban  = cefecges_pcs.pcs_seqno::CHAR(50)</on>
        </join>
        <join type='left' table='cremesas'>
            <on>tmp_taptcuen.remesa  = cremesas.numrem</on>
        </join>
    </from>
    <order>
        1,2,3,23
    </order>
</select>

    `);

    return rsTesoreria;

