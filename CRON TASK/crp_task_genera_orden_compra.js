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

 function crp_task_genera_orden_compra() {
    
    function __insertLineasAlbaran(mIdPedComp, mObjGcommovh, mIntCabped, mIntCabdes) { 
        
        // Se obtiene los articulos asociados a la orden de compra 
            var mObjArticulosCompra = Ax.db.executeQuery(`
                <select>
                    <columns>
                        code,
                        qty,
                        warehouse
                    </columns>
                    <from table='crp_ibth_setreceivedpurchase_l'/>
                    <where>
                    id_receivedpurchase_h = ?
                    </where>
                </select> 
            `, mIdPedComp);

            mObjArticulosCompra.forEach(mArticuloCompra => { 
                /**
                 * ASIGNACION DE LAS LINEAS AL ALBARAN
                 */

                console.log(mArticuloCompra);
            });

        // ===============================================================
        // Actualizar pedido de compra.  
        // =============================================================== 
        // Ax.db.update("gcompedh", {post_hupd: 1 }, {cabid : mIntCabped});

        // ===============================================================
        // Obtener líneas del pedido de compra.                                         
        // ===============================================================
        var mRsGcompedl = Ax.db.executeQuery(`
            <select>
                <columns>
                    gcompedl.orden,  gcompedl.codart,

                    CASE WHEN gcompedl.varlog IS NOT NULL
                            THEN gcompedl.varlog
                            ELSE gartvarl_get_comvldef(
                                    ? ,
                                    ? ,
                                    ? ,
                                    gcompedl.codart)
                        END varlog,

                    gcompedl.desvar, gcompedl.numlot, gcompedl.entfin batch_expdate, gcompedl.canped,
                    gcompedl.canped canmov, gcompedl.udmcom, gcompedl.canpre,
                    gcompedl.udmpre, gcompedl.canalt, gcompedl.udmalt, 
                    gcompedl.precio, gcompedl.dtoli1, gcompedl.dtoli2,
                    gcompedl.dtoli3, gcompedl.dtoimp, gcompedl.pretar,
                    gcompedl.dtotar, gcompedl.terexp, gcompedl.direxp,
                    gcompedl.desamp, gcompedl.regalo, 'N' indmod,
                    gcompedl.linacu, gcompedl.linid linori,
                    gcompedl.canbon, gcompedl.linrel,
                    gcompedl.cabid cabori,
                    'gcompedh'     tabori,
                    garticul.lotes
                </columns>
                <from table="gcompedl">
                    <join table="garticul">
                        <on>gcompedl.codart = garticul.codigo</on>
                    </join> 
                </from>
                <where>
                    gcompedl.cabid = ?
                </where>
                <order>gcompedl.linid</order>
            </select>`, mObjGcommovh.almori, mObjGcommovh.tercer, mObjGcommovh.tipdir, mIntCabped); 
                                
        for(var mRowGcompedl of mRsGcompedl){
            
            mRowGcompedl.cabid  = mIntCabdes;
            mRowGcompedl.ubiori = '0';
            mRowGcompedl.ubides = '0';

            console.log(mRowGcompedl);

            // ===============================================================
            // Crear líneas de albarán de compra.                                         
            // ===============================================================   
            // Ax.db.insert("gcommovl", mRowGcompedl); 
        } 

    }

    var mObjPedidosCompra = {};
    var mObjPedidoOrigen = {};
    var mDateAux = null;

    try {

        Ax.db.beginWork();

        // Obtencion de Ordenes de compra (cabecera) en estado pendiente.
        mObjPedidosCompra = Ax.db.executeQuery(`
            <select>
                <columns>
                    codeoc,
                    id_receivedpurchase_h <alias name='idpedcomp' />
                </columns>
                <from table='crp_ibth_setreceivedpurchase_h'/>
                <where>
                    state = 'P'
                </where>
            </select> 
        `);

        
        // Se genera el albarán para cada orden de compra
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
                        auxchr4,        delega,             depart
                    </columns>
                    <from table='gcompedh'/>
                    <where>
                        docser = ?
                    </where>
                </select> 
            `, mOrdenCompra.codeoc).toOne();

            // Se agrega al ObjPedidoCompra el tipo de documento.
            mObjPedidoOrigen.tipdoc = 'ALOG';

            // Se da formato a los campo fecmov y fecrec
            mDateAux = new Ax.util.Date(mObjPedidoOrigen.fecrec);
            mObjPedidoOrigen.fecrec = mDateAux.format("dd-MM-yyyy");

            mDateAux = new Ax.util.Date(mObjPedidoOrigen.fecmov);
            mObjPedidoOrigen.fecmov = mDateAux.format("dd-MM-yyyy");

            // console.log(mObjPedidoOrigen);
            mObjPedidoOrigen = JSON.parse(mObjPedidoOrigen);

            // Crear albarán de compras con los datos del pedido de compra      
            // var mIntCabAlbComp = Ax.db.call('gcommovh_Insert', 'GCOMPEDH', mObjPedidoOrigen); 
            var mIntCabAlbComp = '14632'; 

            // Se registran las lineas al albaran
            
            __insertLineasAlbaran(mOrdenCompra.idpedcomp, mObjPedidoOrigen, mObjPedidoOrigen.id_ped_ori, mIntCabAlbComp);

            
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