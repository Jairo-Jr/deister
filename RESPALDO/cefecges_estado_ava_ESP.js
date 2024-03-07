/**
 *  Copyright (c) 1988-2019 deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 * "Confidentiality and Non-disclosure" agreements explicitly covering such access.
 *  The copyright notice above does not evidence any actual or intended publication
 *  for disclosure of this source code, which includes information that is confidential
 *  and/or proprietary, and is a trade secret, of deister software
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE,
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 *
 *
 * -----------------------------------------------------------------------------
 *
 *  FUNCTION JS: cefecges_estado_ava(p_pcs_seqno,p_tes_apteid)
 *
 *  Version:       V1.0
 *  Date:          July 17th, 2019
 *  Description:   Accounts receivable/payable status change and accounting.
 *
 */
function cefecges_estado_ava(
    p_pcs_seqno, // Identificador de la gestión de cartera.
    p_tes_apteid // Identificador del apunte de tesorería o valor cero.
) {

    var digest_md5 = new Ax.crypt.Digest("MD5");

    var cefecges_pcs = Ax.db.executeQuery(`
        <select>
            <columns>
                cefecges_pcs.*,

                cempresa.divemp,
                cempresa.placon,
                icon_get_divred(icon_get_moneda(cefecges_pcs.pcs_empcode)) tipred,

				cefeacti.ctafin, cefeacti.difcam, cefeacti.genref, cefeacti.codast, 
                cefeacti.tipgas, cefeacti.efefin, cefeacti.estfin, cefeacti.rettes, 
                cefeacti.coment, cefeacti.agrup1, cefeacti.agrup2, cefeacti.agrup3, 
                cefeacti.agrup4, cefeacti.agrup5, cefeacti.agrup6,

				cefecest.caduca,
				cefeplah.codpla, cefeplah.sustip, cefeplah.susrel, cefeplah.suscta,

                cbancpro.moneda cbancpro_moneda,
                cbancpro.proyec cbancpro_proyec,
                cbancpro.seccio cbancpro_seccio,
                cbancpro.numche cbancpro_numche, 
                cbancpro.numpag cbancpro_numpag,
                cbancpro.numrec cbancpro_numrec,
                cbancpro.numlet cbancpro_numlet,
				cbancpro.cuenta cbancpro_cuenta,
				cbancpro.codban cbancpro_codban,

				CASE WHEN cefeacti.genref = '1' THEN 'C'
					 WHEN cefeacti.genref = '2' THEN 'P'
					 WHEN cefeacti.genref = '3' THEN 'R'
					 WHEN cefeacti.genref = '4' THEN 'L'
				 END numtype,

                (SELECT COUNT(*) 
                  FROM cefeplal_tes 
                 WHERE cefeplal_tes.clase  = cefecges_pcs.pcs_clase 
                   AND cefeplal_tes.codigo = cefeacti.codast
                   AND cefecest.tespos     = 'S') tesoreria 	
            </columns>
            <from table='cefecges_pcs'>
                <join table='cempresa'>
                    <on>cempresa.empcode = cefecges_pcs.pcs_empcode</on>
                </join>
                <join table='cefeacti'>
                    <on>cefeacti.clase  = cefecges_pcs.pcs_clase</on>
                    <on>cefeacti.codigo = cefecges_pcs.pcs_accion</on> 
					<join type='left' table='cefecest'>
						<on>cefeacti.clase  = cefecest.clase</on>
						<on>cefeacti.estfin = cefecest.codigo</on>
					</join>
					<join table='cefeplah' type='left'>
						<on>cefeacti.clase  = cefeplah.clase</on>
						<on>cefeacti.codast = cefeplah.codigo</on>
					</join>										                  
                </join>               
                <join type='left' table='cbancpro'>
                    <on>cbancpro.empcode = cefecges_pcs.pcs_empcode</on>
                    <on>cbancpro.ctafin  = cefecges_pcs.pcs_ctafin</on>
                </join>                
            </from>
            <where>
                pcs_seqno = ?
            </where>
        </select>`, p_pcs_seqno).toOne().setRequired(`Gestión [${p_pcs_seqno}] no encontrada`);

    if (cefecges_pcs.pcs_estado == 'C') {
        throw new Ax.ext.Exception("cefecges_estado_ava01", "cefecges_estado_ava: Gestión [${pcs_seqno}] cerrada", {"pcs_seqno" : p_pcs_seqno});
    }

    // =======================================================================
    // Error si la cuenta financiera no está informada y la acción la requiere.
    // =======================================================================
    if (cefecges_pcs.pcs_ctafin == null && cefecges_pcs.tesoreria != 0) {
        throw new Ax.ext.Exception("cefecges_estado_ava02", "cefecges_estado_ava: La acción [${pcs_clase}/${pcs_accion}] tiene un estado final que requiere la cuenta financiera.",
            {"pcs_clase" : cefecges_pcs.pcs_clase, "pcs_accion" : cefecges_pcs.pcs_accion});
    }

    // ===================================================================================
    // Error si la cuenta financiera no está informada y la acción númera automáticamente.
    // ====================================================================================
    if (cefecges_pcs.pcs_ctafin == null && cefecges_pcs.genref !== 0) {
        throw Error(Ax.text.MessageFormat.format("cefecges_estado_ava: Banco no informado para acción que requiere generación de referencias [{0}]. Cuenta financiera [{1} / {2}].", cefecges_pcs.genref, cefecges_pcs.pcs_empcode, cefecges_pcs.pcs_ctafin));
    }

    // =========================================================================
    // Lock row if SET TRANSACTION in READ COMMITTED :
    // Realizamos el update en esta fase inicial para bloquer el registro y
    // evitar posibles reejecuciones del mismo proceso sobre la misma gestión.
    //
    // Setup del inicio del cierre de la gestión.
    // =========================================================================
    Ax.db.update('cefecges_pcs',
        {'pcs_estado'   : 'C',
            'user_updated' : Ax.db.getUser(),
            'date_updated' : new Ax.sql.Date(),
        },
        {'pcs_seqno' : p_pcs_seqno}
    );

    // =========================================================================
    // CONTROL APLICACIÓN DE CÁLCULOS DE DIFERENCIAS DE CAMBIO EN DIVISAS.
    //
    // Solo se permiten calcular diferencias de cambio si la acción de cartera
    // genera un asiento contable, o bien, se está procesando desde una operación
    // de tesorería, en cualquier otro caso de detiene el proceso.
    //
    // JUSTIFICACÓN:
    // Si realizaramos un cambio de estado con ajuste de diferencias de cambio
    // en los efectos, sin producir contabilización, estaríamos produciendo un
    // descuadre económico en los importes locales de la empresa (al modificar
    // cefectos.import y cefectos.difcam).
    //
    // ACCIONES POSIBLES:
    //    1) Desactive el indicador cefecges_pcs.difcam
    //    2) Complete la parametrización con una plantilla de asiento contable o
    //       utilice la acción de cartera desde una operación de tesorería.
    //
    // =========================================================================
    if (cefecges_pcs.difcam ==  1    && // Debe calcular diferencias de cambio en divisas !
        cefecges_pcs.codpla == null && // No tiene plantilla contable definida !
        p_tes_apteid    ==  0      // No es una gestión invocada desde tesorería !
    ) {
        throw Error(Ax.text.MessageFormat.format("La gestión [{0}] debe calcular diferencias de cambio en divisas y la acción [ {1} / {2} ] no está involucrada en la generación de ningún asiento contable.", p_pcs_seqno, cefecges_pcs.pcs_clase, cefecges_pcs.pcs_accion));
    }

    // =========================================================================
    // Inicializamos variables
    // =========================================================================
    cefecges_pcs.pcs_moneda = cefecges_pcs.pcs_moneda || cefecges_pcs.divemp;

    // =========================================================================
    // Calculo de total gastos en divisa de banco. (Inventamos una columna virtual)
    // =========================================================================
    if (((cefecges_pcs.pcs_gasto1 || 0) != 0 || (cefecges_pcs.pcs_gasto2 || 0) != 0) && cefecges_pcs.cbancpro_moneda == null) {
        throw Error(Ax.text.MessageFormat.format("Gestión [{0}] con gastos informados sin estar el banco informado.", p_pcs_seqno));
    }

    cefecges_pcs.pcs_gasban = cefecges_pcs.cbancpro_moneda != null ? Ax.math.bc.add(cefecges_pcs.pcs_gasto1 || 0, cefecges_pcs.pcs_gasto2 || 0) : 0;

    // =========================================================================
    // Convertimos los importes de la cabecera a signo matematico
    // =========================================================================
    if ((cefecges_pcs.pcs_clase == "P" && cefecges_pcs.tipgas == 0) ||
        (cefecges_pcs.pcs_clase == "C" && cefecges_pcs.tipgas == 1)) {
        cefecges_pcs.pcs_impdiv = Ax.math.bc.mul(-1, cefecges_pcs.pcs_impdiv);
        cefecges_pcs.pcs_gasban = Ax.math.bc.mul(-1, cefecges_pcs.pcs_gasban);
    }

    // =========================================================================
    // Si no está informado el cambio, toma el cambio de la fecha de contabilizacion
    // =========================================================================
    if (cefecges_pcs.pcs_cambio == null) {
        var m_cambio = Ax.db.executeProcedure("icon_get_cambio_ope",
            cefecges_pcs.divemp,
            cefecges_pcs.pcs_moneda,
            cefecges_pcs.pcs_fecpro).toOne();

        cefecges_pcs.pcs_cambio = m_cambio.o_cambio;
        cefecges_pcs.pcs_camope = m_cambio.o_camope;
    }

    // =========================================================================
    //
    // Calcula el importe nominal (sin gastos bancarios) en la moneda del banco.
    //
    //                     IMPBAN    GASBAN    TOTAL_IMPBAN
    //    Salida (Pago)     -1010  +     10  :        -1000
    //    Entrada (Cobro)    +990  +     10  :        +1000
    //
    // Consideraciones:
    //
    //   La columna cefecges_pcs_pcs_impdiv se informa en signo aritmético
    //       según sea cobro (entrada) o pago (salida).
    //       Importe total de la operación expresado en la divisa del proceso.
    //       El importe en divisas debe ser el equivalente contractual al importe nominal de la operación, o sea, no deben incluirse los gastos.
    //
    //
    //   Las columnas de gastos cefecges_pcs_pcs_gasto1 (cefecges_pcs_pcs_gasban)
    //       se informan en positivo independientemente del tipo de operación.
    //
    // =========================================================================

    // ==================================================================================
    // Inicializamos las variables acumuladoras anteriores que se utilizan posteriormente
    // ==================================================================================
    var m_acu_import= 0.0;
    var m_acu_gasban= 0.0;

    // ==================================================================================
    // Inicializamos la variables acumuladora de importe local de efectos de la acción
    // ==================================================================================
    var m_tot_cefectos_imploc= 0;

    // ==================================================================================
    // Modificar los cefectos y el detalle de la gestión.
    // ==================================================================================

    // ==================================================================================
    // El det_agrupa es un contador, el último valor se guarda en cbancpro.
    // ==================================================================================
    var agrupaNum = cefecges_pcs.genref == 1 ? cefecges_pcs.cbancpro_numche :
        cefecges_pcs.genref == 2 ? cefecges_pcs.cbancpro_numpag :
            cefecges_pcs.genref == 3 ? cefecges_pcs.cbancpro_numrec :
                cefecges_pcs.genref == 4 ? cefecges_pcs.cbancpro_numlet :
                    0;

    var agrupaNew          = agrupaNum,
        old_det_agrupa     = '',
        det_agrupaSet      = [],
        cefectosRefbanSet  = [],
        numsNumfin         = 0,
        batch_cefectos     = Ax.db.updateBatch("cefectos"),
        batch_cefecges_det = Ax.db.updateBatch("cefecges_det");

    // En la numeración de documentos la serie debe de existir y no se puede superar el límite superior de la
    // serie.
    if (cefecges_pcs.genref != 0) {
        numsNumfin = Ax.db.executeQuery(`
            <select>
                <columns>
                    numfin 
                </columns>
                <from table='cbancpro_nums'/>
                <where>
                        cbancpro_nums.empcode = '${cefecges_pcs.pcs_empcode}'
                    AND cbancpro_nums.ctafin  = '${cefecges_pcs.pcs_ctafin}'
                    AND cbancpro_nums.numtype = '${cefecges_pcs.numtype}'
                    AND cbancpro_nums.enable  = 1
                </where>
            </select>
        `).toOne()
            .setRequired(`Serie númerica (cbancpro_nums) no encontrada para [${cefecges_pcs.pcs_empcode} / ${cefecges_pcs.pcs_ctafin} / ${cefecges_pcs.numtype}].`)
            .numfin;
    }

    rs_cefectos = Ax.db.executeQuery(`
        <select>
            <columns>
                -- =========================================================
                -- Si la gestión es a Pagar se procesan primero los   
                -- efectos a cobrar.                                  
                -- Si la gestión es a Cobrar se procesan primero los  
                -- efectos a pagar.                                   
                -- =========================================================
                CASE WHEN ? = 'P' AND cefectos.import &lt; 0 THEN 1
                     WHEN ? = 'C' AND cefectos.import > 0 THEN 1
                     ELSE 2
                 END ordre,
                cefectos.*,
                cefecges_det.*,
                (SELECT COUNT(*)
                   FROM cefeacti_est
                  WHERE clase  = ?
                    AND codigo = ?
                    AND cefeacti_est.claori = cefectos.clase
                    AND cefeacti_est.estori = cefectos.estado
                    AND NVL(cefeacti_est.efeori, cefectos.tipefe) = cefectos.tipefe) estori_ok,
                cefeplal_tes.opedeb, cefeplal_tes.opehab, cefeplal_tes.accion,

				<!-- El valor de plal_agrup* = 'entfin' debe de agrupar los que son distintos a cbancpro. -->
				CASE WHEN cterbanc.codban = '${cefecges_pcs.cbancpro_codban}' THEN 0 ELSE 1
				 END entfin,

                <nvl>cefeplal_tes.agrup1, ''</nvl> plal_agrup1,
                <nvl>cefeplal_tes.agrup2, ''</nvl> plal_agrup2,
                <nvl>cefeplal_tes.agrup3, ''</nvl> plal_agrup3,
                <nvl>cefeplal_tes.agrup4, ''</nvl> plal_agrup4,
                <nvl>cefeplal_tes.agrup5, ''</nvl> plal_agrup5,
                <nvl>cefeplal_tes.agrup6, ''</nvl> plal_agrup6,

                '${cefecges_pcs.agrup1}' det_agrup1,
                '${cefecges_pcs.agrup2}' det_agrup2,
                '${cefecges_pcs.agrup3}' det_agrup3,
                '${cefecges_pcs.agrup4}' det_agrup4,
                '${cefecges_pcs.agrup5}' det_agrup5,
                '${cefecges_pcs.agrup6}' det_agrup6
            </columns>
            <from table='cefecges_det'>
                <join table='cefectos'>
                    <on>cefecges_det.det_numero = cefectos.numero</on>
                </join>
                <join type='left' table='cefeplal_tes'>
                    <on>cefeplal_tes.clase  = ?</on>
                    <on>cefeplal_tes.codigo = ?</on>                
                    <on>cefeplal_tes.oricla = cefectos.clase</on>
					<on>cefeplal_tes.oriefe = NVL(${cefecges_pcs.efefin ? "'" + cefecges_pcs.efefin + "'" : null}, cefectos.tipefe)</on>
                </join>
                <join table='cterbanc' type='left'>
                    <on>cterbanc.codigo = cefectos.tercer</on> 
                    <on>cterbanc.numban = cefectos.numban</on> 
                </join>				
            </from>
            <where>
                cefecges_det.pcs_seqno = ?
            </where>
            <order>1</order>
        </select>`, cefecges_pcs.pcs_clase, cefecges_pcs.pcs_clase, cefecges_pcs.pcs_clase, cefecges_pcs.pcs_accion,
        cefecges_pcs.pcs_clase, cefecges_pcs.codast,    p_pcs_seqno).toMemory();

    for (var cefectos of rs_cefectos) {

        // =====================================================================
        // Error si el estado del efecto no es uno de los posibles origenes.
        // =====================================================================
        if (cefectos.estori_ok == 0) {
            throw Error(Ax.text.MessageFormat.format("Efecto con ID: [{0}], estado [{1} / {2}] y tipo de efecto [{3}] no permitido para la acción [{4}].", cefectos.numero, cefectos.clase, cefectos.estado, cefectos.tipefe, cefecges_pcs.pcs_accion));
        }

        // =====================================================================
        // Error si el efecto es un origen de reclasificacion, no se puede evolucionar
        // =====================================================================
        if (cefectos.numdes != 0) {
            throw Error(Ax.text.MessageFormat.format("cefecges_estado_ava: [{0}] Registro con documentos destino (numdes != 0).", cefectos.numero));
        }

        // =====================================================================
        // Sustitución de la cuenta.
        // =====================================================================
        cefectos.det_cuenta = cefectos.cuenta;

        if (cefecges_pcs.sustip != null) {
            cefectos.cuenta = Ax.db.executeFunction("cefecges_get_cuenta",
                columnIndex => { switch (columnIndex) {
                    case 1: return "cuenta";
                    default: return "undefined";}
                },
                cefecges_pcs.sustip,
                cefecges_pcs.susrel,
                cefecges_pcs.suscta,
                cefectos.tercer,
                cefectos.codper,
                cefectos.cuenta,
                cefecges_pcs.cbancpro_cuenta,
                cefecges_pcs.pcs_empcode,
                cefecges_pcs.pcs_clase,
                cefecges_pcs.placon).toOne().cuenta;
        }

        // =====================================================================
        // Si la acción a realizar debe retroceder la tesoreria generada y
        // Antes de manipular los datos del efecto, obtenemos la gestión y el
        // movimiento de tesoreria del que debemos quitar el efecto.
        // Esto es para poder quitar un efecto de una remesa que haya generado
        // tesoreria mediante una evolución de estado.
        // =====================================================================
        if (cefecges_pcs.rettes == 1) {
            var ret_taptcuen = Ax.db.executeQuery(`
                    <select first='1'>
                        <columns>
                            taptcuen.apteid, taptcuen.feccon, taptcuen.concid, taptcuen.audcon, taptcuen.audtes
                        </columns>
                        <from table='taptcuen'>
                            <join table='taptfluj'>
                                <on>taptcuen.apteid = taptfluj.rowenl</on>
                            </join>
                        </from>
                        <where>
                            taptcuen.gesori = ? AND
                            taptfluj.numero = ?
                        </where>
                    </select>
                `, cefectos.numges, cefectos.numero).toOne();

            if (ret_taptcuen.feccon != null ||
                ret_taptcuen.concid != null  ||
                ret_taptcuen.audcon != 'N'  ||
                ret_taptcuen.audtes != 'N') {
                throw Error(Ax.text.MessageFormat.format("cefecges_estado_ava: taptcuen.apteid: {0} Intentando retroceder tesoreria contabilizada, conciliada o auditada.", ret_taptcuen.apteid));
            }  else {

                // Durante la transacción desconectamos el check c_taptcuen1 para evitar
                // error de constraint durante la desvinculacion de los efectos de
                // cartera del movimiento de tesoreria. Al final de la transacción se
                // resolverá.
                //
                // CHECK c_taptcuen1 :
                //         ((debhab = 'D' AND impcta >= 0.0) OR
                //          (debhab = 'H' AND impcta <= 0.0))
                // TODO:
                //                <deferred-constraint name='c_taptcuen1' />

                // Descolgamos el efecto de su movimiento de tesoreria.
                Ax.db.delete('taptfluj', {numero: cefectos.numero, rowenl: ret_taptcuen.apteid});

                // Validacion: Calculo y generacion de gastos bancarios.
                Ax.db.call("taptcuen_valida", ret_taptcuen.apteid, 'U');

                // Eliminamos el apunte de tesoreria si el importe es igual a cero
                // y ya no queda ningun efecto asociado.
                var m_cnt_taptfluj = Ax.db.executeGet(`SELECT COUNT(*) FROM taptfluj WHERE rowenl = ?`, ret_taptcuen.apteid);

                if (!m_cnt_taptfluj) {
                    // Descolgamos el efecto de su movimiento de tesoreria.
                    Ax.db.delete('taptcuen', {apteid : ret_taptcuen.apteid, impcta : 0});
                }
            }
        }

        // =====================================================================
        // PARTIR EFECTO / Determina la particion del efecto :
        // Si el importe introducido es distinto al del efecto, debemos partir el
        // efecto, para cambiar de estado solo el importe indicado. Esto lo tenemos
        // que hacer antes de invertir el signo.
        // =====================================================================
        // TODO: Que pasa con las diferencias de cambio y los gastos acumulados cuando se parte un efecto ?
        // Tamnbien se deberían repartir y deberiamos devolver la parte que queda al efecto
        if (!Ax.math.bc.equals(Ax.math.bc.of(cefectos.impdiv), Ax.math.bc.of(cefectos.det_impdiv))) {
            var prc = Ax.db.executeProcedure("cefectos_partir", columnIndex => {
                switch (columnIndex) {
                    case 1: return "import";
                    case 2: return "impliq";
                    case 3: return "impiva";
                    case 4: return "impret";
                    case 5: return "auxnum1";
                    case 6: return "auxnum2";
                    case 7: return "auxnum3";
                    case 8: return "auxnum4";
                    case 9: return "auxnum5";
                    default: return "undefined";
                }
            }, cefectos.numero, cefectos.det_impdiv, null).toOne();
            // Tanto mergedobj como cefectos tienen integrados los valores de prc

            // TODO : a revisar
            // var mergedobj = Object.assign(cefectos, prc);
            cefectos.import  = prc.import;
            cefectos.impiva  = prc.impiva;
            cefectos.impret  = prc.impret;
            cefectos.auxnum1 = prc.auxnum1;
            cefectos.auxnum2 = prc.auxnum2;
            cefectos.auxnum3 = prc.auxnum3;
            cefectos.auxnum4 = prc.auxnum4;
            cefectos.auxnum5 = prc.auxnum5;
        }

        // ====== COMIENZO DE SIGNO MATEMATICO =================================
        // Una vez roto el efecto, trabajamos siempre con signo matematico, asi que
        // si el efecto es de pago le damos la vuelta al signo.
        // =====================================================================
        if ((cefectos.clase == "P" && cefecges_pcs.tipgas == 0) ||
            (cefectos.clase == "C" && cefecges_pcs.tipgas == 1)) {
            cefectos.det_impdiv = Ax.math.bc.mul(-1, cefectos.det_impdiv);
            cefectos.import     = Ax.math.bc.mul(-1, cefectos.import);
            cefectos.impdiv     = Ax.math.bc.mul(-1, cefectos.impdiv);
        }

        // =====================================================================
        // Calcula importes de pronto pago.
        // =====================================================================
        if (cefectos.codppa) {
            cefectos.impppa = Ax.db.executeProcedure("icon_get_calppa",
                cefectos.numero,
                cefectos.codppa,
                cefectos.feccon,
                (cefectos.fecaux || cefectos.fecha),
                cefectos.empcode,
                cefectos.moneda,
                cefectos.impdiv
            ).toValue();
        }

        var cefectos_new_import = cefectos.import;

        // =====================================================================
        // Prorrateo de gastos. Se guarda en moneda del banco
        // Calcula la prorrata de gastos por efecto, pero OJO, en cobros
        // En el último registro, los gastos deben redondearse para ajustar al total
        // =====================================================================
        cefectos.det_gasban = 0;
        if (cefecges_pcs.pcs_gasban != 0 && cefecges_pcs.pcs_impdiv != 0) {

            if (!rs_cefectos.isLast()) {
                cefectos.det_gasban = Ax.math.bc.of(Ax.math.bc.div(Ax.math.bc.math(cefecges_pcs.pcs_gasban, cefectos.det_impdiv), cefecges_pcs.pcs_impdiv)).setScale(cefecges_pcs.tipred, Ax.math.bc.RoundingMode.HALF_UP);
            } else {
                cefectos.det_gasban = Ax.math.bc.sub(cefecges_pcs.pcs_gasban, m_acu_gasban);
            }
        }

        // =====================================================================
        // Calculo de diferencias de cambio.
        // =====================================================================
        cefectos.det_difcam = 0;
        if (cefecges_pcs.difcam != 0 &&
            cefecges_pcs.divemp != cefectos.moneda) {

            cefectos.cambio = cefecges_pcs.pcs_cambio;
            cefectos.camope = cefecges_pcs.pcs_camope;

            // =================================================================
            // En el ultimo registro, el importe local se redondea para ajustar
            // al local.
            // =================================================================
            /*
            if (!rs_cefectos.isLast()) {
                cefectos_new_import = Ax.db.executeFunction("icon_get_implocal", cefecges_pcs.divemp, cefectos.moneda, cefecges_pcs.pcs_fecpro, cefecges_pcs.pcs_cambio, cefecges_pcs.pcs_camope, cefectos.det_impdiv, cefecges_pcs.tipred).toValue();
            } else {
                // Si cefecges_pcs.pcs_import se asume que hay un solo efecto y que proviene
                // de la evolución de cefectos.
                cefectos_new_import = Ax.math.bc.sub(Ax.math.bc.isZero(cefecges_pcs.pcs_import) ?
                Ax.db.executeFunction("icon_get_implocal", cefecges_pcs.divemp, cefectos.moneda, cefecges_pcs.pcs_fecpro, cefecges_pcs.pcs_cambio, cefecges_pcs.pcs_camope, cefectos.det_impdiv, cefecges_pcs.tipred).toValue() :
                cefecges_pcs.pcs_import, m_acu_import);
            }
            */

            cefectos_new_import = Ax.db.executeFunction("icon_get_implocal", cefecges_pcs.divemp, cefectos.moneda, cefecges_pcs.pcs_fecpro, cefecges_pcs.pcs_cambio, cefecges_pcs.pcs_camope, cefectos.det_impdiv, cefecges_pcs.tipred).toValue();

            // =================================================================
            // El signo de difcam representa si es una diferencia de cambio a nuestro
            // favor o en contra.
            // Como estamos trabajando con importes en signo matematico,la resta siempre
            // da el resultado correcto.
            // =================================================================
            cefectos.det_difcam = Ax.math.bc.sub(cefectos_new_import, cefectos.import);
        }

        m_acu_import += cefectos_new_import;
        m_acu_gasban += cefectos.det_gasban;

        // =====================================================================
        // Cambio de datos de efecto según nuevos valores en la gestión
        // Si la fecha auxiliar es nula, preservamos el vencimiento inicial
        // =====================================================================
        cefectos.fecven = cefecges_pcs.pcs_fecven || cefectos.fecven;
        cefectos.fecaux = cefecges_pcs.pcs_fecaux || cefectos.fecaux;
        cefectos.ctafin = cefecges_pcs.pcs_ctafin || cefectos.ctafin;
        cefectos.codper = cefecges_pcs.pcs_codper || cefectos.codper;
        cefectos.refban = cefecges_pcs.pcs_refban || cefectos.refban;
        cefectos.tipdoc = cefecges_pcs.pcs_tipdoc || cefectos.tipdoc;
        cefectos.tipefe = cefecges_pcs.pcs_tipefe || cefecges_pcs.efefin || cefectos.tipefe;

        // No sirve ||, pcs_numban es númerico y (0 || null) es null
        cefectos.numban = cefecges_pcs.pcs_numban == null ? cefectos.numban : cefecges_pcs.pcs_numban;

        // ========================================================================
        // Si cefeacti_estfin es null, significa que no queremos modificar el estado
        // del efecto.
        // ========================================================================
        cefectos.estado = cefecges_pcs.estfin || cefectos.estado;
        cefectos.caduca = cefecges_pcs.caduca || cefectos.caduca;
        cefectos.opeant = cefectos.openum;
        cefectos.numges = cefecges_pcs.pcs_seqno;

        // =====================================================================
        // Atención, la columna cefectos_feccon es muy importante para el correcto
        // funcionamiento del informe de posición histórica de deuda de terceros.
        // Si el cambio de estado lo provoca la contabilización de tesoreria con
        // avance automatico de cartera, actualizamos la fecha de contabilizacion.
        // En cualquier caso (vengamos o no de tesoreria), si el cambio de estado
        // provoca una contabilización, asignamos la fecha de contabilizacion del
        // efecto con la fecha del asiento contable generado por el cambio de estado
        // que es la que tiene que prevalecer.
        // La fecha taptcuen.feccon siempre coincide con la fecha de proceso de la
        // gestió de cartera, por este motivo asignamos el contenido de
        // cefecges_pcs_pcs_fecpro, considerad que por cambios realizados en el
        // script taptcuen_contab, en este punto no se dispone aún de contenido en
        // taptcuen_feccon.
        // =====================================================================
        if (p_tes_apteid > 0 || cefecges_pcs.codpla != null) {
            cefectos.feccon = cefecges_pcs.pcs_fecpro;
        }

        // =====================================================================
        // Si caduca="P" y no está informada la remesa, lo paramos porque sólo se
        // permite caduca="P" si se trata de una remesa.
        // =====================================================================
        if (cefectos.caduca == "P" && cefectos.remesa == null) {
            throw Error(Ax.text.MessageFormat.format("cefecges_estado_ava: No se permite caduca a [Propuesto] si la gestión no procede de una remesa."));
        }

        // =====================================================================
        // Si caduca="N" desvinculamos el efecto de la posible remesa.
        // =====================================================================
        if (cefectos.caduca == "N") {
            cefectos.remesa = null;
        }

        // =====================================================================
        // Si la accion pregunta el comentario, lo trasladamos al efecto
        // =====================================================================
        if (cefecges_pcs.coment != 0) {
            cefectos.coment = cefecges_pcs.pcs_desc || cefectos.coment;
        }

        // Acumulado del importe local de los efectos -->
        m_tot_cefectos_imploc = Ax.math.bc.add(m_tot_cefectos_imploc, cefectos_new_import);

        // ====== FIN DE SIGNO MATEMATICO ======================================
        // Hasta aqui hemos trabajado con signo matematico. Ahora debemos de
        // volver a convertir los importes en signo de cartera: un negativo
        // es = a un positivo con clase=P.
        // =====================================================================
        if ((cefectos.clase == "P" && cefecges_pcs.tipgas == 0) ||
            (cefectos.clase == "C" && cefecges_pcs.tipgas == 1)) {
            cefectos_new_import = Ax.math.bc.mul(-1, cefectos_new_import);
            cefectos.det_impdiv = Ax.math.bc.mul(-1, cefectos.det_impdiv);
            cefectos.import     = Ax.math.bc.mul(-1, cefectos.import);
            cefectos.impdiv     = Ax.math.bc.mul(-1, cefectos.impdiv);
        }

        // =====================================================================
        // Calculo de la agrupacion a la que pertenece el efecto
        // =====================================================================
        var m_det_agrupa = "";

        var tmp_str = "";
        for (x=1; x<=6; x++) {
            if (cefectos["det_agrup" + x] != "") {
                tmp_str += cefectos[cefectos["det_agrup" + x]] + "|";
            }
        }

        m_det_agrupa = digest_md5.update(tmp_str).digest();

        // =====================================================================
        // Numerar los distintos grupos. Se convierte el hash a un número entero,
        // Si el genref !=0 empieza con el último número de cbancpro.
        // Array det_agrupaSet para obtener el número en función del hash.
        // =====================================================================
        if (m_det_agrupa != old_det_agrupa) {

            var agrupaNumFind = det_agrupaSet.filter(agrupa => agrupa.det_agrupa == m_det_agrupa);

            if (agrupaNumFind.length == 0) {

                agrupaNew +=1;

                // =================================================================
                // En numeración de documentos genref != 0 se verifica si el número
                // está dentro de la serie, si no o está se busca la siguiente serie
                // superior y se activa.
                // =================================================================
                if (cefecges_pcs.genref != 0 && agrupaNew > numsNumfin) {

                    // Buscar la siguiente serie superior.
                    var mapcbancpro_nums = Ax.db.executeQuery(`
                            <select first='1'>
                                <columns>
                                    cbancpro_nums.numini, cbancpro_nums.numfin
                                </columns>
                                <from table='cbancpro_nums'/>
                                <where>
                                        cbancpro_nums.empcode = ? 
                                    AND cbancpro_nums.ctafin  = ?
                                    AND cbancpro_nums.numtype = ?
                                    AND cbancpro_nums.numini >= ?
                                </where>
                                <order>1</order>
                            </select>
                        `, cefecges_pcs.pcs_empcode, cefecges_pcs.pcs_ctafin, cefecges_pcs.numtype, agrupaNew).toOne();

                    if (!mapcbancpro_nums.seqno) {
                        throw Error(`Se ha superado el límite de la serie númerica (cbancpro_nums) y no se ha encontrado otra para la empresa [${cefecges_pcs.pcs_empcode}] y cuenta [${cefecges_pcs.pcs_ctafin}].`);
                    }

                    agrupaNew  = mapcbancpro_nums.numini;
                    numsNumfin = mapcbancpro_nums.numfin;
                }

                det_agrupaSet.push({det_agrupa : m_det_agrupa, agrupanum : agrupaNew});
                agrupaNum = agrupaNew;
            } else {
                agrupaNum = agrupaNumFind[0].agrupanum;
            }

            old_det_agrupa = m_det_agrupa;
        }

        // =====================================================================
        // Si se generan numeraciones de documentos (cheques, pagares, ...) se
        // actualia la referencia del efecto
        // =====================================================================
        if (cefecges_pcs.genref != 0) {
            cefectos.refban = agrupaNum;
        }

        // =====================================================================
        // Calculo de la agrupacion de tesoreria a la que pertenece el efecto
        // =====================================================================
        var m_det_grphash = "";
        var cefectosRefban = false;

        if (cefecges_pcs.tesoreria != 0 ) {
            if (cefectos.opedeb == null && cefectos.opehab == null) {
                throw new Error(`Efecto: [${cefectos.numero}], gestión genera tesorería y no hay operación deudora/acreedora informada en cefeplal_tes`);
            }

            var tmp_str = cefectos.opedeb + "|" + cefectos.opehab + "|" + cefectos.accion + "|";
            for (x=1; x<=6; x++) {
                var cefectosField = cefectos["plal_agrup" + x];

                if (cefectosField != "") {
                    if (cefectosField == 'refban' || cefectosField == 'numero') {
                        cefectosRefban = true;
                    }
                    tmp_str += cefectos[cefectosField] + "|";
                }
            }

            m_det_grphash = digest_md5.update(tmp_str).digest();

            // Guardar el hash para saber si el hash se ha construido en función
            // del refban o el número.
            if (cefectosRefban) {
                cefectosRefbanSet.push(m_det_grphash);
            }
        }

        // =====================================================================
        // Update cefecges_det.
        // =====================================================================
        batch_cefecges_det.addBatch({'det_cuenta'  : cefectos.det_cuenta,
                'det_difcam'  : cefectos.det_difcam,
                'det_gasban'  : cefectos.det_gasban,
                'det_gastos'  : (cefectos.det_gasban != 0 && cefecges_pcs.cbancpro_moneda != null ?
                    Ax.db.executeFunction("icon_get_implocal", cefecges_pcs.pcs_empcode, cefecges_pcs.cbancpro_moneda, cefecges_pcs.pcs_fecpro, null, null, cefectos.det_gasban, cefecges_pcs.tipred).toValue() :
                    0) || 0,
                'det_agrupa'  : agrupaNum,
                'det_grphash' : m_det_grphash,
                'det_import'  : cefectos.import},
            {'pcs_seqno'   : cefecges_pcs.pcs_seqno,
                'det_numero'  : cefectos.det_numero});

        // =====================================================================
        // Update cefectos.
        // =====================================================================
        // Customización de la modificación de los efectos del avance de gestion
        // Incluimos en el update los auxiliares para poderlos personalizar en
        // el include.
        batch_cefectos.addBatch({'cuenta'  : cefectos.cuenta,
                'tipefe'  : cefectos.tipefe,
                'estado'  : cefectos.estado,
                'caduca'  : cefectos.caduca,
                'fecven'  : cefectos.fecven,
                'remesa'  : cefectos.remesa,
                'ctafin'  : cefectos.ctafin,
                'codper'  : cefectos.codper,
                'numban'  : cefectos.numban,
                'refban'  : cefectos.refban,
                'tipdoc'  : cefectos.tipdoc,
                'import'  : cefectos_new_import,
                'impdiv'  : cefectos.det_impdiv,
                'cambio'  : cefectos.cambio,
                'camope'  : cefectos.camope,
                'impiva'  : cefectos.impiva,
                'impret'  : cefectos.impret,
                'coment'  : cefectos.coment,
                'gastos'  : Ax.math.bc.add(cefectos.gastos, cefectos.det_gasban != 0 ? Ax.db.executeFunction("icon_get_implocal", null, null, null, cefectos.cambio, cefectos.camope, cefectos.det_gasban, cefecges_pcs.tipred).toValue()
                    : 0),
                'difcam'  : Ax.math.bc.add(cefectos.difcam, cefectos.det_difcam),
                'impppa'  : cefectos.impppa,
                'feccam'  : cefecges_pcs.date_created,
                'feccon'  : cefectos.feccon,
                'fecaux'  : cefectos.fecaux,
                'opeant'  : cefectos.opeant,
                'openum'  : cefectos.openum + 1,
                'numges'  : cefectos.numges,
                'auxchr1' : cefectos.auxchr1,
                'auxchr2' : cefectos.auxchr2,
                'auxchr3' : cefectos.auxchr3,
                'auxchr4' : cefectos.auxchr4,
                'auxchr5' : cefectos.auxchr5,
                'auxnum1' : cefectos.auxnum1,
                'auxnum2' : cefectos.auxnum2,
                'auxnum3' : cefectos.auxnum3,
                'auxnum4' : cefectos.auxnum4,
                'auxnum5' : cefectos.auxnum5,
                'user_updated' : Ax.db.getUser(),
                'date_updated' : new Ax.sql.Date()},
            {"numero"  : cefectos.numero});
    } // end rs_cefectos

    batch_cefectos.close();
    batch_cefecges_det.close();

    // =========================================================================
    // Actualizar el contador de cbancpro.
    // =========================================================================
    if (cefecges_pcs.genref != 0) {
        Ax.db.execute(`UPDATE cbancpro
                          SET numche = CASE WHEN ${cefecges_pcs.genref} = 1 THEN ${agrupaNum} ELSE numche END,
                              numpag = CASE WHEN ${cefecges_pcs.genref} = 2 THEN ${agrupaNum} ELSE numpag END,
                              numrec = CASE WHEN ${cefecges_pcs.genref} = 3 THEN ${agrupaNum} ELSE numrec END,
                              numrec = CASE WHEN ${cefecges_pcs.genref} = 4 THEN ${agrupaNum} ELSE numlet END
                        WHERE empcode = '${cefecges_pcs.pcs_empcode}'
                          AND ctafin  = '${cefecges_pcs.pcs_ctafin}'`);
    }

    // =========================================================================
    // Generar tesoreria
    // =========================================================================
    if (cefecges_pcs.tesoreria != 0) {

        var titescfg = Ax.db.executeQuery(`
                    <select first='1'>
                        <columns>oricar, getflu</columns>
                        <from table='titescfg'/>
                    </select>
                `).toOne().setRequired(Ax.text.MessageFormat.format("No encontrado el registro de configuracion en titescfg"));

        // Para cada una de las posibles agrupaciones debemos generar los grupos de efectos
        // Como los tipos de efecto origen van en cada linea: claori + efeori, tenemos que agrupar por
        // el resto de campos. Es un poco "truco", pero es tal y como lo tenemos ahora.
        // agrupamos por tocos los campos menos por oricla y oriefe

        // Sentencia GROUP
        var vm_sql_group_by = "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14";

        // Calculamos datos segun las agrupaciones resultantes para saber si el movimiento de tesoreria sera ingreso o gasto
        var rs_cefecges_grp = Ax.db.executeQuery(`
            <select>
                <columns>
                    cefecges_det.det_grphash,
                    CASE WHEN ctipoefe.fecope = 'V' THEN cefectos.fecven + ctipoefe.diaope
                         WHEN ctipoefe.fecope = 'E' THEN cefectos.fecha  + ctipoefe.diaope
                         ELSE ${Ax.db.toDateQuery(cefecges_pcs.pcs_fecpro)} + ctipoefe.diaope
                     END fecope,
                    ctipoefe.fecope efeope,
                    ctipoefe.diaope,
                    cefectos.empcode,
                    cefectos.ctafin,
                    <!-- Siempre se toma la remesa de la gestion frente a la remesa de los efectos -->
                    <nvl>${cefecges_pcs.pcs_numrem}, cefectos.remesa</nvl> remesa,
                    cefectos.sistem,
                    cefeplal_tes.opedeb, 
					cefeplal_tes.opehab, 
					cefeplal_tes.accion,
					cremesas.fecrem, 
					cremesas.fecval,
					NVL(cefeacti.tipgas, 0) tipgas,

                    CASE WHEN SUM(sdm_abs(cefectos.import)) != 0 AND ctipoefe.fecope = 'P'
                        THEN <date>SUM( (cefectos.fecven-<today/>) * sdm_abs(cefectos.import)) / SUM(sdm_abs(cefectos.import)) + <today/> + MAX(ctipoefe.diaope)</date>
                        ELSE MAX(<today/>)
                     END fecpon,
                    MAX(cefectos.proyec) max_proyec,
                    MAX(cefectos.seccio) max_seccio,
                    MAX(cefectos.tipefe) max_tipefe,
                    MIN(cefectos.tercer) min_tercer,
                    MAX(cefectos.tercer) max_tercer,
                    MIN(cefectos.codper) min_codper,
                    MAX(cefectos.codper) max_codper,
                    MAX(cefectos.refban) max_refban,

					<!-- El signo es incondicional: Negativo para ingresos (cobros) y positivo para salidas (pagos). -->
					<!-- En fllujos SI es necesario considerar devoluciones o reingreso que alteran su signo.        -->
                    SUM(CASE WHEN cefectos.clase = 'C'  THEN -cefectos.import  ELSE cefectos.import END) import
                </columns>
                <from table='cefecges_det'>
                    <join table='cefectos'>
                        <on>cefecges_det.det_numero = cefectos.numero</on>
                    </join>
                    <join type='left' table='ctipoefe'>
                        <on>ctipoefe.clase  = cefectos.clase</on>
                        <on>ctipoefe.codigo = cefectos.tipefe</on>
                    </join>
                    <join type='left' table='cefeplal_tes'>
                        <on>cefeplal_tes.clase  = ?</on>
                        <on>cefeplal_tes.codigo = ?</on>
                        <on>cefeplal_tes.oricla = cefectos.clase</on>
                        <on>cefeplal_tes.oriefe = NVL(${cefecges_pcs.efefin ? "'" + cefecges_pcs.efefin + "'" : null}, cefectos.tipefe)</on>
						<join type='left' table='cefeacti'>
							<on>cefeacti.codigo = cefeplal_tes.accion</on>
							<on>cefeacti.clase  = '${cefecges_pcs.pcs_clase}'</on>
						</join>						
                    </join>
                    <join type='left' table='cremesas'>
                        <on>cremesas.numrem  = <nvl>${cefecges_pcs.pcs_numrem}, cefectos.remesa</nvl></on>
                    </join>									
                </from>
                <where>
                    cefecges_det.pcs_seqno = ? 
                </where>
                <group>
                    ${vm_sql_group_by}
                </group>
            </select>
            `, cefecges_pcs.pcs_clase, cefecges_pcs.codast, p_pcs_seqno).toMemory();

        for (var cefecges_grp of rs_cefecges_grp) {

            var taptcuen = {};
            taptcuen.empcode = cefecges_grp.empcode;
            taptcuen.ctafin  = cefecges_grp.ctafin;
            taptcuen.sistem  = cefecges_grp.sistem;
            taptcuen.refban  = "";
            taptcuen.origen  = "C";
            taptcuen.impcta  = 0;
            taptcuen.tipmov  = titescfg.oricar;
            taptcuen.gesori  = cefecges_pcs.pcs_seqno;
            taptcuen.remesa  = cefecges_grp.remesa;

            // Evaluar taptcuen.fecope.
            // Segun definición de tipo de efecto:
            // P Ponderada  (fecha de vencimiento ponderada segun importe local)
            // R Emision remesa
            // F Fin o liquidación prevista de remesa
            // E Emision efecto
            // V Vencimiento efecto
            // G Gestión

            switch (cefecges_grp.efeope) {
                case 'P' :
                    taptcuen.fecope = cefecges_grp.fecpon;
                    break;
                case 'R' :
                    taptcuen.fecope = cefecges_grp.fecrem;
                    break;
                case 'F' :
                    taptcuen.fecope = cefecges_grp.fecval;
                    break;

                // Emision, Vencimiento, Gestión
                default:
                    taptcuen.fecope = cefecges_grp.fecope;
                    break;
            }

            // Evaluar taptcuen.proyec y taptcuen.seccio
            taptcuen.proyec = cefecges_pcs.cbancpro_proyec;
            taptcuen.seccio = cefecges_pcs.cbancpro_seccio;

            // Evaluar taptcuen.accion y taptcuen.clase
            taptcuen.accion = cefecges_grp.accion
            taptcuen.clase  = cefecges_grp.accion == null ? null : cefecges_pcs.pcs_clase;

            // Evaluar taptcuen.debhab y taptcuen.opefin
            if (cefecges_grp.import <= 0) {
                taptcuen.debhab = "D";
                taptcuen.opefin = cefecges_grp.opedeb;
                order_insert_taptfluj = " ASC";
            } else {
                taptcuen.debhab = "H";
                taptcuen.opefin = cefecges_grp.opehab;
                order_insert_taptfluj = " DESC";
            }

            // Evaluar taptcuen.fecval
            taptcuen.fecval = Ax.db.executeFunction("ites_get_fecval", cefecges_grp.empcode, cefecges_grp.ctafin, taptcuen.debhab, taptcuen.opefin, taptcuen.fecope).toValue();

            // Evaluar taptcuen.notobs
            // Notas del movimiento de tesoreria a generar
            // Si hay una agrupacion por tercero o perceptor, se toma el nombre del
            // tercero o perceptor y se aplica como notas de la tesoreria
            if (cefecges_pcs.coment != 0) {
                taptcuen.notobs = cefecges_pcs.pcs_desc;
                if (taptcuen.notobs == null) {
                    taptcuen.notobs = "";
                    if (cefecges_grp.min_tercer == cefecges_grp.max_tercer) {
                        taptcuen.notobs += Ax.db.executeGet(`SELECT nombre FROM ctercero WHERE codigo = ?`, cefecges_grp.max_tercer) + " ";
                    }
                    if (cefecges_grp.min_codper == cefecges_grp.max_codper) {
                        taptcuen.notobs += Ax.db.executeGet(`SELECT nombre FROM ctercero WHERE codigo = ?`, cefecges_grp.max_codper) + " ";
                    }
                }
            }

            // =================================================================
            // Cuando se notifica a tesorería con agrupacion por efecto (numero) o
            // con agrupación por referencia bancaria (refban) se informa el campo
            // refban de taptcuen con dicho valor.
            // =================================================================
            if (cefectosRefbanSet.filter(refban => refban == cefecges_grp.det_grphash).length != 0) {
                taptcuen.refban = cefecges_grp.max_refban;
            }

            var toperfin = Ax.db.executeQuery(`
                        <select prefix='toperfin_'>
                            <columns>genefe</columns>
                            <from table='toperfin' />
                            <where>
                                toperfin.debhab = ? AND
                                toperfin.opefin = ?
                            </where>
                        </select>
                `, taptcuen.debhab, taptcuen.opefin).toOne();

            if (toperfin.genefe == "A" || toperfin.genefe == "C" ) {
                taptcuen.audtes = "S";
            } else {
                taptcuen.audtes = "N";
            }

            // order_insert_taptfluj impide un posible fallo en el check c_taptcuen1.
            //
            // CHECK c_taptcuen1 :
            //         ((debhab = 'D' AND impcta >= 0.0) OR
            //          (debhab = 'H' AND impcta <= 0.0))

            taptcuen.apteid = Ax.db.insert("taptcuen", taptcuen).getSerial();

            // Insert por cada efecto un registro en taptfluj
            /*
                                                CASE WHEN '${cefecges_pcs.divemp}' = cefectos.moneda THEN
                                                        CASE WHEN (cefectos.clase = 'P' AND ${cefecges_grp.tipgas} = 0) OR
                                                                  (cefectos.clase = 'C' AND ${cefecges_grp.tipgas} = 1) THEN cefectos.import
                                                             ELSE -cefectos.import
                                                         END
                                                    ELSE
                                                        icon_get_implocal('${cefecges_pcs.divemp}',
                                                                           cefectos.moneda,
                                                                          ${Ax.db.toDateQuery(taptcuen.fecope)},
                                                                          null,
                                                                          null,
                                                                         (CASE WHEN (cefectos.clase = 'P' AND ${cefecges_grp.tipgas} = 0) OR
                                                                                    (cefectos.clase = 'C' AND ${cefecges_grp.tipgas} = 1) THEN cefectos.impdiv
                                                                               ELSE -cefectos.impdiv
                                                                          END),
                                                                          null)
                                                 END impflu, -- en la moneda de la empresa de tatpcuen
            */
            // El signo debe considerar posibles devoluciones de cobros  Entran como 'pago' pero deben buscar cartera de cobro.
            // Igualmente reingresos o retrocesiones de pagos Entran como 'cobro' pero van contra cartera de pagos.
            Ax.db.execute(`INSERT INTO taptfluj(rowenl, numero, codflu, impflu, monflu, camflu, impdiv,
                                                gtsfin, gtscon, ctaflu, auxflu, proflu, secflu)
                           SELECT   --+ORDERED
                                    ${taptcuen.apteid},
                                    cefectos.numero,
                                    tflujfin.codflu, 
                                    
									CASE WHEN (cefectos.clase = 'P' AND ${cefecges_grp.tipgas} = 0) OR
											  (cefectos.clase = 'C' AND ${cefecges_grp.tipgas} = 1) THEN cefectos.import
										 ELSE -cefectos.import
										END impflu,
										                                     
                                    '${cefecges_pcs.cbancpro_moneda}' monflu,
                                    
                                    icon_get_cambio(cefectos.empcode, '${cefecges_pcs.cbancpro_moneda}', ${Ax.db.toDateQuery(taptcuen.fecope)}) camflu,
                                    
                                    CASE WHEN '${cefecges_pcs.cbancpro_moneda}' = cefectos.moneda THEN
                                    
                                            (CASE WHEN (cefectos.clase = 'P' AND ${cefecges_grp.tipgas} = 0) OR
                                                       (cefectos.clase = 'C' AND ${cefecges_grp.tipgas} = 1) THEN cefectos.impdiv
                                                 ELSE -cefectos.impdiv
                                             END)
                                         
                                         ELSE

                                            icon_get_implocal('${cefecges_pcs.cbancpro_moneda}',
                                                                cefectos.moneda,
                                                                ${Ax.db.toDateQuery(taptcuen.fecope)},
                                                                null,
                                                                null,
                                                                (CASE WHEN (cefectos.clase = 'P' AND ${cefecges_grp.tipgas} = 0) OR
                                                                           (cefectos.clase = 'C' AND ${cefecges_grp.tipgas} = 1) THEN cefectos.impdiv 
                                                                      ELSE -cefectos.impdiv
                                                                 END),     
                                                                null) 
                                     END impdiv,
                                    
                                   tflujfin.gtsfin,
                                   NULL::CHAR(1),	-- gtscon
                                   cefectos.cuenta, -- icon_get_ctanem(cefectos.empcode, tflujfin.ctaflu),                                            
                                   NULL::CHAR(14),  -- cefectos no tiene cuenta auxiliar para auxflu
                                   cefectos.proyec, -- '${taptcuen.proyec}',
                                   cefectos.seccio  -- '${taptcuen.seccio}'
                              FROM cefecges_det, cefectos, ctipoefe, tflujfin
                             WHERE cefecges_det.det_numero = cefectos.numero
                               AND ctipoefe.clase  = cefectos.clase
                               AND ctipoefe.codigo = cefectos.tipefe
                               AND tflujfin.codflu = ites_get_flufin(cefectos.empcode, 
                                                                     cefectos.proyec, 
                                                                     cefectos.seccio, 
                                                                     cefectos.jusser,
                                                                     cefectos.docser,  
                                                                     cefectos.clase, 
                                                                     cefectos.tipefe, 
                                                                     cefectos.estado,
                                                                     cefectos.tercer,  
                                                                     cefectos.cuenta,   
                                                                     cefectos.tipdoc, 
                                                                     '${taptcuen.debhab}',
                                                                     '${taptcuen.opefin}',  
                                                                     '${titescfg.getflu}',                                                          
                                                                     'cefectos', 
                                                                     cefectos.numero)
							   -- Los flujos no pueden ser de comisiones ni de intereses.	
							   AND tflujfin.gtsfin IS NULL
                               AND cefecges_det.pcs_seqno   = ?
                               AND cefecges_det.det_grphash = ?
                               AND cefectos.empcode         = ?
                               AND cefectos.sistem          = ?
                               AND ctipoefe.fecope          = ?
                               AND ctipoefe.diaope          = ?
							   AND (CASE WHEN ctipoefe.fecope = 'V' THEN cefectos.fecven + ctipoefe.diaope
										 ELSE ${Ax.db.toDateQuery(cefecges_pcs.pcs_fecpro)} + ctipoefe.diaope
									 END) = ?
                           ORDER BY 4 ${order_insert_taptfluj}`, p_pcs_seqno, cefecges_grp.det_grphash, cefecges_grp.empcode, cefecges_grp.sistem, cefecges_grp.efeope,
                cefecges_grp.diaope, cefecges_grp.fecope);

            // Si la operación de tesoreria generada, tiene el indicador genefe para que contabilice
            // automaticamente, debemos contabilizar
            if (toperfin.genefe == "C") {
                Ax.db.call("taptcuen_valida", taptcuen.apteid, 'U');

                Ax.db.call("taptcuen_wb_account", taptcuen.apteid, null);

            } else {

                // Validacion: Calculo y generacion de gastos bancarios.
                Ax.db.call("taptcuen_valida", taptcuen.apteid, 'I');
            }
        }
    }

    // =========================================================================
    // Contabilización
    // =========================================================================
    var m_loteid = 0;
    if (cefecges_pcs.codpla != null) {
        m_loteid = Ax.db.call("cefecges_pcs_wb_account", p_pcs_seqno);
    }

    // =========================================================================
    // Setup del fin del cierre de la gestión.
    // =========================================================================
    Ax.db.update("cefecges_pcs",
        {"pcs_estado"  : "C",
            "user_updated" : Ax.db.getUser(),
            "date_updated" : new Ax.sql.Date()
        },
        {"pcs_seqno" : p_pcs_seqno});

    return m_loteid;
}