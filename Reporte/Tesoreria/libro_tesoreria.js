
    /**
     *
     * */

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

    var rsTesoreria = Ax.db.executeQuery(`
    <union type='all'>

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
                capuntes.cuenta,  ccuentas.nombre,  capuntes.moneda, taptcuen.fecope,
                '' taxmed,  '' nomefe,  '' auxnum3,

                SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1))) serie,

                capuntes.docser docser,

                taptcuen.apteid,
                ''::integer ciftyp,
                '' cif,
                '' nombre,
                toperfin.nomope,  capuntes.concep, capuntes.debe, capuntes.haber, '1' estado,
                cremesas.fecrem,  taptcuen.remesa,
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
                taptfluj.numero IS NULL
                AND capuntes.cuenta LIKE '104%' AND capuntes.haber != 0
                AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
                AND ${mCondInput}
            </where>
        </select>

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
                NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope))) fecven,
                MONTH(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope)))) mesval,
                capuntes.cuenta,  ccuentas.nombre,  capuntes.moneda, taptcuen.fecope,
                ctipoefe.taxmed,  ctipoefe.nomefe,  cefectos.auxnum3,

                NVL(SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1))),
                SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1)))) serie,

                NVL(cefectos.docser, capuntes.docser) docser,

                taptcuen.apteid,
                ctercero.ciftyp,
                ctercero.cif,
                ctercero.nombre,
                toperfin.nomope,  capuntes.concep, capuntes.debe, capuntes.haber, '1' estado,
                cremesas.fecrem,  taptcuen.remesa,
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
                                <on>cefectos.docser  = capuntes.docser</on>
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
                WHEN capuntes.cuenta LIKE '42%' AND NVL(taptcuen.concid, 0) != 0 THEN 0 ELSE 1 END) = 1
                AND NVL(cefectos.auxnum3, '') != '07'
                AND cefectos.clase != 'C'
                AND cefectos.impdiv &gt;= 0
                AND capuntes.fecha BETWEEN ${mFECINI} AND ${mFECFIN}
                AND ${mCondInput}

            </where>
        </select>

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
                SUBSTR(cbancpro.codban,5,2) codban, capuntes.fecha,  capuntes.asient,
                NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope))) fecven,
                MONTH(NVL(cefectos.fecven,(NVL(capuntes.fecval,taptcuen.fecope)))) mesval,
                capuntes.cuenta,  ccuentas.nombre,  capuntes.moneda, taptcuen.fecope,
                ctipoefe.taxmed,  ctipoefe.nomefe,  cefectos.auxnum3,

                NVL(SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1))),
                SUBSTR(capuntes.docser, 0, ((CHARINDEX('-', capuntes.docser)-1)))) serie,

                NVL(cefectos.docser, capuntes.docser) docser,

                taptcuen.apteid,
                ctercero.ciftyp,
                ctercero.cif,
                ctercero.nombre,
                toperfin.nomope,  capuntes.concep, capuntes.debe, capuntes.haber, '1' estado,
                cremesas.fecrem,  taptcuen.remesa,
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
                        <join type='left' table='cefectos'>
                            <on>taptfluj.numero  = cefectos.numero</on>
                            <join  table='ctipoefe'>
                                <on>cefectos.clase  = ctipoefe.clase</on>
                                <on>cefectos.tipefe  = ctipoefe.codigo</on>
                            </join>
                            <join  table='ctercero'>
                                <on>cefectos.codper  = ctercero.codigo</on>
                            </join>

                        </join>
                        <join table='capuntes'>
                            <on>taptcuen.rowenl  = capuntes.apteid</on>
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
                WHEN capuntes.cuenta LIKE '42%' AND NVL(taptcuen.concid, 0) != 0 THEN 0 ELSE 1 END) = 1
                AND NVL(cefectos.auxnum3, '') != '07'
                AND cefectos.clase != 'C'
                AND cefectos.impdiv &gt;= 0
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
                SUBSTR(cbancpro.codban,5,2) codban, taptcuen.fecope fecha,  ''::INTEGER asient,
                NVL(cefectos.fecven,(NVL(taptcuen.fecval,taptcuen.fecope))) fecven,
                MONTH(NVL(cefectos.fecven,(NVL(taptcuen.fecval,taptcuen.fecope)))) mesval,
                taptfluj.ctaflu,  ccuentas.nombre,  taptfluj.monflu, taptcuen.fecope,
                ctipoefe.taxmed,  ctipoefe.nomefe,  cefectos.auxnum3,

                SUBSTR(cefectos.docser, 0, ((CHARINDEX('-', cefectos.docser)-1))) serie,

                cefectos.docser docser,

                taptcuen.apteid,
                ctercero.ciftyp,
                ctercero.cif,
                ctercero.nombre,
                toperfin.nomope,  '' concep,
                CASE WHEN taptfluj.impdiv &lt; 0 THEN taptfluj.impdiv
                ELSE 0 END debe,
                CASE WHEN taptfluj.impdiv &gt; 0 THEN taptfluj.impdiv
                ELSE 0 END haber,
                '1' estado,
                cremesas.fecrem,  taptcuen.remesa,
                28 field_28,
                29 field_29,
                30 field_30,
                31 field_31,
                32 field_32,
                cefeplah.diario, taptcuen.concid
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
                NVL(cefectos.auxnum3, '') != '07'
                AND cefectos.clase != 'C'
                AND cefectos.impdiv &gt;= 0
                AND NVL(taptcuen.loteid, 0) = 0
                AND taptcuen.fecope BETWEEN ${mFECINI} AND ${mFECFIN}

                AND ${mCondInput_2}

            </where>
        </select>
    </union>
    `);

    return rsTesoreria;

