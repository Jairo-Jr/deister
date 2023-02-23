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

 *  JS:  Name Function

 *  Version     : Version
 *  Date        : 17-02-2022
 *  Description : Describe lo que hace la funcion
 *
 *
 *  LOCAL FUNCTIONS:
 *  ==================
 *
 *
 *  CALLED FROM:
 *  ==================
 *
 *
 *  PARAMETERS:
 *  ==================
 *
 *
 **/

function crp_task_ibth_genera_albaran_compra() {

    /**
     * LOCAL FUNCTION
     * 
     * mIdOrdComp: Id de la orden de compra.
     * mObjPedidoOrigen: Obj del pedido de origen.
     * mIntCabped: Id del cabid de pedido.
     * mIntCabAlbComp: Id del cabid del albran de compra.
     */
    function __insertLineasAlbaran(mIdOrdComp, mObjPedidoOrigen, mIntCabped, mIntCabAlbComp) {

        try {

            var mRsGcompedl = {};
            var mDateAux = null;

            // Se obtiene los articulos asociados a la orden de compra 
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
                console.log('****');
                console.log(mArticuloCompra);
                // ===============================================================
                // Actualizar pedido de compra.  
                // =============================================================== 
                Ax.db.update("gcompedh", {
                    post_hupd: 1
                }, {
                    cabid: mIntCabped
                });

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
                        'N'             indmod,        gcompedl.udmpre, gcompedl.direxp, gcompedl.dtoli2
                    </columns>
                    <from table="gcompedl" />
                    <where>
                            gcompedl.cabid = ?
                        AND gcompedl.codart = ?
                    </where>
                </select>
            `, mIntCabped, mArticuloCompra.code).toOne();

                mRsGcompedl.cabid = mIntCabAlbComp;

                mRsGcompedl.canmov = mArticuloCompra.qty;
                mRsGcompedl.canpre = mArticuloCompra.qty;



                if (mArticuloCompra.expdate) {
                    mDateAux = new Ax.util.Date(mArticuloCompra.expdate);
                    mRsGcompedl.batch_expdate = mDateAux.format("dd-MM-yyyy");
                } else if (mRsGcompedl.batch_expdate) {
                    mDateAux = new Ax.util.Date(mRsGcompedl.batch_expdate);
                    mRsGcompedl.batch_expdate = mDateAux.format("dd-MM-yyyy");
                } else {
                    mRsGcompedl.batch_expdate = null;
                }

                // mRsGcompedl.batch_expdate = (mArticuloCompra.expdate) ? mArticuloCompra.expdate : mRsGcompedl.batch_expdate;

                mRsGcompedl.numlot = (mArticuloCompra.batchcode) ? mArticuloCompra.batchcode : mRsGcompedl.numlot;

                mRsGcompedl = JSON.parse(mRsGcompedl);
                console.log('*-*-*');
                console.log(mRsGcompedl);

                // ===============================================================
                // Crear líneas de albarán de compra.                                         
                // ===============================================================   
                Ax.db.insert("gcommovl", mRsGcompedl);


            });



        } catch (error) {
            console.error('ERROR-> ', error);

        }
    }

    /**
     * Deficnion de variables
     */
    var mObjPedidosCompra = {};
    var mObjPedidosCompra_2 = {};
    var mObjPedidoOrigen = {};
    var mDateAux = null;
    var mBoolValidPed = true;
    var mDateToday = new Ax.util.Date();

    // var mArrEstadosPed = {
    //     E: "Provisional",

    // };
    // var mArrEstadosDoc = {

    // };

    try {

        Ax.db.beginWork();

        /**
         * Obtencion de Ordenes de compra (cabecera) en estado pendiente, registrados por IBTH.
         */
        mObjPedidosCompra = Ax.db.executeQuery(`
            <select>
                <columns>
                    codeoc,
                    id_receivedpurchase_h <alias name='idordcomp' />
                </columns>
                <from table='crp_ibth_setreceivedpurchase_h'/>
                <where>
                    state = 'P'
                </where>
            </select> 
        `).toJSONArray();

        // Se genera el albarán para cada orden de compra
        mObjPedidosCompra.forEach(mOrdenCompra => {

            console.log(mOrdenCompra);
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

            /**
             * Se valida la existencia del pedido de compra
             */

            if (!mObjPedidoOrigen.id_ped_ori) {
                /**
                 * Si no existe el pedido de compra, se registra el error en la tabla: crp_ibth_setreceivedpurchase_h
                 * y se obvia la generacion del Albarán
                 */
                mBoolValidPed = false;
                Ax.db.update(`crp_ibth_setreceivedpurchase_h`, {
                    state: 'E',
                    message_error: `Documento de pedido de compra [${mOrdenCompra.codeoc}] no existente.`,
                    date_error: mDateToday
                }, {
                    id_receivedpurchase_h: mOrdenCompra.idordcomp
                });
            } else {

                /**
                 * Se valida el estado del pedido de compra:
                 *      estcab: Estado del pedido
                 *      estado: Estado del documento
                 */
                if (mObjPedidoOrigen.estcab != 'V' || !['P', 'N'].includes(mObjPedidoOrigen.estado)) {
                    /**
                     * Si estado del pedido no es valido o el del documento es diferente de P (parcial) o N (pendiente)
                     */
                    mBoolValidPed = false;
                    Ax.db.update(`crp_ibth_setreceivedpurchase_h`, {
                        state: 'E',
                        message_error: `Documento [${mOrdenCompra.codeoc}] en estado [${mObjPedidoOrigen.estcab}] y [${mObjPedidoOrigen.estado}]`,
                        date_error: mDateToday
                    }, {
                        id_receivedpurchase_h: mOrdenCompra.idordcomp
                    });
                } else {

                    console.log('SI: ', mOrdenCompra.codeoc);

                    /**
                     * 
                     */

                    // Se agrega al ObjPedidoCompra el tipo de documento.
                    mObjPedidoOrigen.tipdoc = 'ALOG';

                    /**
                     * Se da formato a los campos:
                     *      fecmov: Fecha del albarán
                     *      fecrec: Fecha del proveedor
                     *      valor:  Fecha de recepción
                     */
                    mDateAux = new Ax.util.Date(mObjPedidoOrigen.fecrec);
                    mObjPedidoOrigen.fecrec = mDateAux.format("dd-MM-yyyy");

                    mDateAux = new Ax.util.Date(mObjPedidoOrigen.fecmov);
                    mObjPedidoOrigen.fecmov = mDateAux.format("dd-MM-yyyy");

                    mDateAux = new Ax.util.Date(mDateToday);
                    mObjPedidoOrigen.valor = mDateAux.format("dd-MM-yyyy");

                    /**
                     * Se da formato al objeto del pedido de origen.
                     */
                    mObjPedidoOrigen = JSON.parse(mObjPedidoOrigen);



                    // Crear albarán de compras con los datos del pedido de compra      
                    var mIntCabAlbComp = Ax.db.call('gcommovh_Insert', 'GCOMPEDH', mObjPedidoOrigen);
                    // var mIntCabAlbComp = '14638';
                    console.log('CABID-ALBARAN', mIntCabAlbComp);

                    // Se registran las lineas al albaran
                    __insertLineasAlbaran(mOrdenCompra.idordcomp, mObjPedidoOrigen, mObjPedidoOrigen.id_ped_ori, mIntCabAlbComp);

                    /**
                     * Order status is updated
                     */
                    Ax.db.executeProcedure("gcompedl_set_head_estado", mObjPedidoOrigen.id_ped_ori); // cabid del pedido

                    /**
                     * Revalidate the order
                     */
                    Ax.db.call("gcompedh_Valida", mObjPedidoOrigen.id_ped_ori); // cabid del pedido

                    // ===============================================================
                    // Validar albarán de compras.
                    // ===============================================================
                    Ax.db.call("gcommovh_Valida", mIntCabAlbComp); // cabid del albaran

                }

            }
        });


        Ax.db.commitWork();

    } catch (error) {
        console.error(error);

        Ax.db.rollbackWork();

        // throw new Ax.ext.Exception("ERROR: [${error}]", {
        //     error
        // });
    }

}