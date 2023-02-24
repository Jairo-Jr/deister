/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 *  Confidentiality and Non-disclosure' agreements explicitly covering such access.
 *  The notice above does not evidence any actual or intended publication
 *  for disclosure of this source code, which includes information that is confidential
 *  and/or proprietary, and is a trade secret, of deister software
 *
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE,
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART. 
 *
 * -----------------------------------------------------------------------------
 * 

 *  JS:  crp_task_ibth_genera_albaran_compra

 *  Version     : 1,1
 *  Date        : 23-02-2023
 *  Description : Función que genera albaranes de compra de las órdenes de compra 
 *                que se encuentren en estado pendiente. 
 *
 *
 *  CALLED FROM:
 *  ==================
 *      CRON TASK SCHEDULER -> 'crp_task_ibth_genera_albaran_compra' 
 *                              Genera albaranes de compra de forma periódica 
 *                              a partir de órdenes de compra que se encuentren 
 *                              en estado pendiente (P).
 * 
 **/

 function crp_task_ibth_genera_albaran_compra() {

    /**
     * LOCAL FUNCTION: __insertarLineasAlbaran
     * 
     * Función local que registras las líneas de la orden de compra en el albarán generado.
     * 
     *      @param   {Integer}   mIdOrdComp         Identificador de la orden de compra
     *      @param   {Integer}   mIntCabped         Identificador del pedido de compra
     *      @param   {Integer}   mIntCabAlbComp     Identificador del albarán generado
     * 
     */
    function __insertarLineasAlbaran(mIdOrdComp, mIntCabped, mIntCabAlbComp) {

        var mRsGcompedl = {};
        var mDateAux = null;

        // ===============================================================
        // Se obtiene los artículos asociados a la orden de compra.
        // ===============================================================
        var mObjArticulosCompra = Ax.db.executeQuery(`
            <select>
                <columns>
                    code,
                    qty,
                    warehouse,
                    expdate,
                    batchcode
                </columns>
                <from table='crp_ibth_setreceivedpurchase_l'/>
                <where>
                id_receivedpurchase_h = ?
                </where>
            </select> 
        `, mIdOrdComp).toJSONArray();

        mObjArticulosCompra.forEach(mArticuloCompra => {

            // ===============================================================
            // Obtener líneas del pedido de compra.
            // =============================================================== 
            mRsGcompedl = Ax.db.executeQuery(`
                <select>
                    <columns>
                        gcompedl.entfin batch_expdate, gcompedl.canped, gcompedl.dtoli3, gcompedl.dtoimp, 
                        gcompedl.linid  linori,        gcompedl.dtotar, gcompedl.terexp, gcompedl.regalo, 
                        gcompedl.canped canmov,        gcompedl.codart, gcompedl.varlog, gcompedl.numlot, 
                        gcompedl.cabid  cabori,        gcompedl.udmalt, gcompedl.precio, gcompedl.dtoli1, 
                        'gcompedh'      tabori,        gcompedl.desvar, gcompedl.desamp, gcompedl.pretar, 
                        '0'             ubiori,        gcompedl.linacu, gcompedl.canalt, gcompedl.orden,  
                        '0'             ubides,        gcompedl.linrel, gcompedl.canpre, gcompedl.udmcom, 
                        'N'             indmod,        gcompedl.udmpre, gcompedl.direxp, gcompedl.dtoli2,
                        gcompedl.canpen
                    </columns>
                    <from table="gcompedl" />
                    <where>
                            gcompedl.cabid = ?
                        AND gcompedl.codart = ?
                    </where>
                </select>
            `, mIntCabped, mArticuloCompra.code).toOne();

            // ===============================================================
            // Actualizar pedido de compra.  
            // =============================================================== 
            Ax.db.update("gcompedh", 
                {
                    post_hupd: 1
                }, {
                    cabid: mIntCabped
                }
            );

            // ===============================================================
            // Se agrega datos a líneas para el albarán.
            // ===============================================================
            mRsGcompedl.cabid = mIntCabAlbComp;
            mRsGcompedl.canmov = mArticuloCompra.qty;
            mRsGcompedl.canpre = mArticuloCompra.qty;
            mRsGcompedl.numlot = (mArticuloCompra.batchcode) ? mArticuloCompra.batchcode : mRsGcompedl.numlot;

            // ===============================================================
            // Se cambia el formato a las fechas para su registro.
            // ===============================================================
            if (mArticuloCompra.expdate) {

                mDateAux = new Ax.util.Date(mArticuloCompra.expdate);
                mRsGcompedl.batch_expdate = mDateAux.format("dd-MM-yyyy");
            } else if (mRsGcompedl.batch_expdate) {

                mDateAux = new Ax.util.Date(mRsGcompedl.batch_expdate);
                mRsGcompedl.batch_expdate = mDateAux.format("dd-MM-yyyy");
            } else {

                mRsGcompedl.batch_expdate = null;
            }

            // ===============================================================
            // Se da formato al objeto de líneas para su registro en el albarán.
            // ===============================================================
            mRsGcompedl = JSON.parse(mRsGcompedl);

            // ===============================================================
            // Crear líneas de albarán de compra.                                         
            // ===============================================================   
            Ax.db.insert("gcommovl", mRsGcompedl);

        });
    }

    /**
     * LOCAL FUNCTION: __addDataPedido
     * 
     * Función local que agrega datos y da formato al objeto de cabecera para el albarán.
     * 
     *      @param   {Object}   mObjPedidoOrigen         Objeto con informacion del albarán
     * 
     */
    function __addDataPedido(mObjPedidoOrigen, mStrGuiaProveedor) {
        
        var __mDateAux = null;

        // ===============================================================
        // Se agrega al ObjPedidoCompra el tipo de documento 
        // y la guía proveedor.
        // ===============================================================
        mObjPedidoOrigen.tipdoc = 'ALOG';
        mObjPedidoOrigen.refter = mStrGuiaProveedor;

        // ===============================================================
        //  Se da formato a los campos:
        //          fecmov: Fecha del albarán
        //          fecrec: Fecha del proveedor
        //          valor:  Fecha de recepción
        // ===============================================================
        __mDateAux = new Ax.util.Date(mObjPedidoOrigen.fecrec);
        mObjPedidoOrigen.fecrec = __mDateAux.format("dd-MM-yyyy");

        __mDateAux = new Ax.util.Date(mObjPedidoOrigen.fecmov);
        mObjPedidoOrigen.fecmov = __mDateAux.format("dd-MM-yyyy");

        __mDateAux = new Ax.util.Date(mDateToday);
        mObjPedidoOrigen.valor = __mDateAux.format("dd-MM-yyyy");

        // ===============================================================
        // Se da formato al objeto del pedido de origen.
        // ===============================================================
        mObjPedidoOrigen = JSON.parse(mObjPedidoOrigen);

        return mObjPedidoOrigen;

    }

    /**
     * LOCAL FUNCTION: __addDataPedido
     * 
     * Función local que agrega datos y da formato al objeto de cabecera para el albarán.
     * 
     *      @param   {Integer}      mIdOrdComp         Identificador de la orden de compra
     *      @param   {String}       mStrDocOri         Código del documento de origen
     *      @param   {Integer}      mIntCabped         Identificador del pedido de compra
     * 
     */
    function __validArticulos(mIdOrdComp, mStrDocOri, mIntCabped) {

        var mRsGcompedl = {};
        var mBoolArticuloValido = true;

        // ===============================================================
        // Se obtiene los artículos asociados a la orden de compra.
        // ===============================================================
        var mObjArticulosCompra = Ax.db.executeQuery(`
            <select>
                <columns>
                    code,
                    qty,
                    warehouse,
                    expdate,
                    batchcode
                </columns>
                <from table='crp_ibth_setreceivedpurchase_l'/>
                <where>
                id_receivedpurchase_h = ?
                </where>
            </select> 
        `, mIdOrdComp).toJSONArray(); 

        mObjArticulosCompra.forEach(mArticuloCompra => {

            // ===============================================================
            // Obtener líneas del pedido de compra.
            // ===============================================================
            mRsGcompedl = Ax.db.executeQuery(`
                <select>
                    <columns>
                        gcompedl.entfin batch_expdate, gcompedl.canped, gcompedl.dtoli3, gcompedl.dtoimp, 
                        gcompedl.linid  linori,        gcompedl.dtotar, gcompedl.terexp, gcompedl.regalo, 
                        gcompedl.canped canmov,        gcompedl.codart, gcompedl.varlog, gcompedl.numlot, 
                        gcompedl.cabid  cabori,        gcompedl.udmalt, gcompedl.precio, gcompedl.dtoli1, 
                        'gcompedh'      tabori,        gcompedl.desvar, gcompedl.desamp, gcompedl.pretar, 
                        '0'             ubiori,        gcompedl.linacu, gcompedl.canalt, gcompedl.orden,  
                        '0'             ubides,        gcompedl.linrel, gcompedl.canpre, gcompedl.udmcom, 
                        'N'             indmod,        gcompedl.udmpre, gcompedl.direxp, gcompedl.dtoli2,
                        gcompedl.canpen
                    </columns>
                    <from table="gcompedl" />
                    <where>
                            gcompedl.cabid = ?
                        AND gcompedl.codart = ?
                    </where>
                </select>
            `, mIntCabped, mArticuloCompra.code).toOne();

            // ===============================================================
            // Se valida la existencia del código de artículo 
            // en el pedido de compra.
            // ===============================================================
            if (!mRsGcompedl.cabori) {

                mBoolArticuloValido = false;
                throw `El codigo de articulo [${mArticuloCompra.code}] no existe en el pedido de compra [${mStrDocOri}].`;
            } else {

                // ===============================================================
                // Si cantidad de la OC supera la cantidad pendiente 
                // registrada en el pedido de compra, se genera error en 
                // la creación del albarán
                // ===============================================================
                if (mArticuloCompra.qty > mRsGcompedl.canpen) {

                    mBoolArticuloValido = false;
                    throw `La cantidad [${mArticuloCompra.qty}] del articulo [${mArticuloCompra.code}] supera a lo registrado en el pedido de compra [${mStrDocOri}].`;
                }
            }
        })

        return mBoolArticuloValido;

    }

    // ===============================================================
    // Deficnion de variables
    // ===============================================================
    var mObjPedidosCompra = {};
    var mObjPedidoOrigen = {};
    var mDateToday = new Ax.util.Date();
    var mUserName = Ax.db.getUser();
    var mBoolValidArticulos = false;
    var mIntIdOrdenCompra = null;

    var mObjProcLog = require('clogproh');
    mObjProcLog.start('crp_task_ibth_genera_albaran', 'crp_ibth_setreceivedpurchase_h', 1);
    
    // ===============================================================
    // INICIO DE LA TRANSACCIÓN.  
    // =============================================================== 
    try {

        Ax.db.beginWork(); 

        // ===============================================================
        // Obtención de Órdenes de compra (cabecera) 
        // en estado pendiente, registrados por IBTH.
        // ===============================================================
        mObjPedidosCompra = Ax.db.executeQuery(`
            <select>
                <columns>
                    codeoc,
                    gr,
                    id_receivedpurchase_h <alias name='idordcomp' />
                </columns>
                <from table='crp_ibth_setreceivedpurchase_h'/>
                <where>
                    state = 'P'
                </where>
            </select> 
        `).toJSONArray();

        mObjPedidosCompra.forEach(mOrdenCompra => {

            mObjPedidoOrigen = Ax.db.executeQuery(`
                <select>
                    <columns>
                        fecha <alias name='fecmov' />, fecfin <alias name='fecrec' />, codalm <alias name='almori' />, docser <alias name='docori' />, cabid <alias name='id_ped_ori' />,
                        tercer,         tipdir,             divisa,         cambio,             tipefe,
                        frmpag,         terenv,             direnv,         terexp,             direxp,
                        numexp,         portes,             terfac,         dirfac,             dtogen,
                        dtopp,          porgar,             clasif,         refter,             coment,
                        nommos,         direcc,             codnac,         nomnac,             codpos,
                        poblac,         codprv,             nomprv,         telef1,             telef2,
                        fax,            email,              codpre,         codpar,             indmod,
                        auxchr4,        delega,             depart,         estcab,             estado
                    </columns>
                    <from table='gcompedh'/>
                    <where>
                        docser = ?
                    </where>
                </select> 
            `, mOrdenCompra.codeoc).toOne();

            mIntIdOrdenCompra = mOrdenCompra.idordcomp;

            // ===============================================================
            // Se valida la existencia del pedido de compra
            // ===============================================================
            if (!mObjPedidoOrigen.id_ped_ori) {

                // ===============================================================
                // Si no existe el pedido de compra, se registra el error 
                // en la tabla: crp_ibth_setreceivedpurchase_h y se obvia 
                // la generación del Albarán
                // ===============================================================
                throw `Documento de pedido de compra [${mOrdenCompra.codeoc}] no existente.`;

            } else {

                // ===============================================================
                // Se valida el estado del pedido de compra:
                //      estcab: Estado del pedido
                //      estado: Estado del documento
                // ===============================================================
                if (mObjPedidoOrigen.estcab != 'V' || !['P', 'N'].includes(mObjPedidoOrigen.estado)) {

                    // ===============================================================
                    // Si estado del pedido no es válido o el del documento es diferente de P (parcial) o N (pendiente).
                    // ===============================================================
                    throw `Documento [${mOrdenCompra.codeoc}] en estado [${mObjPedidoOrigen.estcab}] y [${mObjPedidoOrigen.estado}]`;

                } else {

                    // ===============================================================
                    // La información de cabecera del pedido es válido.
                    // ===============================================================

                    // ===============================================================
                    // Se procede a validar los articulos registrados en
                    // la Orden de Compra y los del pedido de compra
                    // ===============================================================
                    
                    mBoolValidArticulos = __validArticulos(mOrdenCompra.idordcomp, mObjPedidoOrigen.docori, mObjPedidoOrigen.id_ped_ori); 

                    // ===============================================================
                    // Si los articulos son los correctos se procede a generar el albaran.
                    // ===============================================================
                    if (mBoolValidArticulos) {
                        
                        // ===============================================================
                        // Se agrega data al objeto del pedido origen
                        // ===============================================================
                        mObjPedidoOrigen = __addDataPedido(mObjPedidoOrigen, mOrdenCompra.gr);

                        // ===============================================================
                        // Crear albarán de compras con los datos del pedido de compra      
                        // ===============================================================
                        var mIntCabAlbComp = Ax.db.call('gcommovh_Insert', 'GCOMPEDH', mObjPedidoOrigen);

                        // ===============================================================
                        // Se registran las lineas al albaran
                        // ===============================================================
                        __insertarLineasAlbaran(mOrdenCompra.idordcomp, mObjPedidoOrigen.id_ped_ori, mIntCabAlbComp);

                        // ===============================================================
                        // Se actualiza el estado del pedido
                        // ===============================================================
                        Ax.db.executeProcedure("gcompedl_set_head_estado", mObjPedidoOrigen.id_ped_ori);

                        // ===============================================================
                        // Revalidar el pedido
                        // ===============================================================
                        Ax.db.call("gcompedh_Valida", mObjPedidoOrigen.id_ped_ori);

                        // ===============================================================
                        // Validar albarán de compras. 
                        // ===============================================================
                        Ax.db.call("gcommovh_Valida", mIntCabAlbComp);

                        // ===============================================================
                        // Actualiza el estado de la Orden de Compra a Completado (C)
                        // ===============================================================
                        Ax.db.update(`crp_ibth_setreceivedpurchase_h`, 
                            {
                                state: 'C',
                                user_processed: mUserName,
                                date_processed: mDateToday
                            }, {
                                id_receivedpurchase_h: mOrdenCompra.idordcomp
                            }
                        );

                        // ===========================================================================================
                        // La función registra el proceso realizado correctamente.
                        // ===========================================================================================
                        mObjProcLog.log(`La orden de compra Id :[${mOrdenCompra.idordcomp} - ${mOrdenCompra.codeoc}] fue procesada correctamente [Id Albarán: ${mIntCabAlbComp}]`, null, null, null, mIntCabAlbComp, null, 1, null);

                    }

                }

            }
        });


        Ax.db.commitWork();

    } catch (error) {
        
        Ax.db.rollbackWork(); 

        mObjProcLog.err(`${error.message || error}`, '', null, null, mIntIdOrdenCompra, null); 

        Ax.db.update(`crp_ibth_setreceivedpurchase_h`, 
            {
                state: 'E',
                message_error: `${error.message || error}`,
                date_error: mDateToday
            }, {
                id_receivedpurchase_h: mIntIdOrdenCompra
            }
        );
        
    }

    // ===========================
    // Cerrar proceso LOG
    // =========================== 
    mObjProcLog.end();
}