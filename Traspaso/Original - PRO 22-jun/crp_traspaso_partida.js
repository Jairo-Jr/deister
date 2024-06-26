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
 * 
 *  JS:  crp_traspaso_partida
 * 
 *  Version     : 1.1
 *  Date        : 21-06-2023
 *  Description : Función que realiza el traspaso de Ingresos y gastos (cpar_premovi) 
 *                y su Componente (cinmcomp) asociado hacia una Partida de inversión (cpar_parprel) 
 *                y Elemento (cinmelem) determinada respectivamente.
 * 
 * 
 *  CALLED FROM:
 *  ==================
 *                [OBJ] cpar_premovi - ACTION_52
 * 
 *  PARAMETERS:
 *  ==================
 *                @param    {object}    pObjData    Object information
 *                                                  String      codpre      Codigo del presupuesto
 *                                                  String      empcode     Empresa
 *                                                  String      estado      Estado
 *                                                  Integer     linid       Identificador del ingreso y gasto
 *                                                  String      tabori      Tabla de origen
 *                                                  Integer     auxfec1     Identificador del componente
 * 
 *                @param    {object}    pObjField   Object information
 *                                                  String      codpar      Codigo de la partida de destino
 *                                                  String      codele      Codigo del elemento de destino
 * 
 **/
function crp_traspaso_partida(pObjData, pObjField) {
    
    try { 
        Ax.db.beginWork();
        
        // ===============================================================
        // Data proveniente del formulario
        // mObjData {
        //          codpre      Presupuesto
        //          empcode     Empresa
        //          estado      Estado
        //          linid       Id. gasto
        //          tabori      Origen
        //          auxfec1     Id. componente
        //       }
        // ===============================================================
        var mObjData = Ax.util.js.object.assign({}, pObjData);
        console.log('mObjData', mObjData);
        // ===============================================================
        // Data proveniente del modal
        // mObjField {
        //          codpar      Codigo de la partida
        //          codele      Codigo del elemento
        //       }
        // ===============================================================
        var mObjField = Ax.util.js.object.assign({}, pObjField);
        console.log('mObjField', mObjField);
        var mStrNewCodpar   = mObjField.codpar;   // Partida destino
        var mStrNewElement  = mObjField.codele;   // Elemento destino
        
        var mStrCodpre      = mObjData.codpre;    // Presupuesto
        var mStrEmpcode     = mObjData.empcode;   // Empresa
        var mStrEstado      = mObjData.estado;    // Estado
        var mIntLinid       = mObjData.linid;     // Id. gasto
        var mStrTabori      = mObjData.tabori;    // Origen
        var mIntSeqnoComp   = mObjData.auxfec1;   // Id. componente
        
        if (mStrTabori == "gcomfach" && mStrEstado == 'A'){

            var mStrEstado = Ax.db.executeGet(`
                SELECT cpar_parprel.estado
                  FROM cpar_parprel
                 WHERE codpre  = ?
                   AND codpar  = ?
                   AND empcode = ?
            `, mStrCodpre, mStrNewCodpar, mStrEmpcode);
            
            if (mStrEstado != 'AC'){
                // throw new Ax.ext.Exception(`El estado de la partida a trasferir [${mStrNewCodpar}] se encuentra bloqueada.`);
                throw `El estado de la partida de destino [${mStrNewCodpar}] no se encuentra Activa.`;
            }
        
            var mStrUserCode = Ax.ext.user.getCode();
        
            /**
             * Se actualiza en "Ingresos y gastos" la nueva partida
             **/
            Ax.db.update('cpar_premovi', 
                {
                    codpar       : mStrNewCodpar,
                    user_updated : mStrUserCode,
                    date_updated : new Ax.util.Date()
                }, 
                {
                    linid : mIntLinid 
                }
            ); 
            
            /**
             * Obtenemos la empresa 
             **/
            var mStrEmpcode = Ax.db.executeGet(`
                SELECT cinmcomp.empcode
                FROM cinmcomp
                WHERE cinmcomp.seqno = ?
            `,mIntSeqnoComp);
            
            /**
             * Obtenemos el bien y elemento relacionado al
             * presupuesto y a la nueva partida ingresada
             **/
            var mObjCinmelem = Ax.db.executeQuery(`
                SELECT cinmelem.codinm,
                       cinmelem.empcode,
                       cinmelem.codele
                  FROM cinmelem
                 WHERE cinmelem.codpre  = ?
                   AND cinmelem.codpar  = ?
                   AND cinmelem.empcode = ?
                   AND cinmelem.codele  = ?
            `,mStrCodpre, mStrNewCodpar, mStrEmpcode, mStrNewElement).toOne();
            console.log('new element', mObjCinmelem);
            /**
             * Se actualiza en el componente el nuevo bien y elemento relacionado
             * al presupuesto original y a la nueva partida
             **/
            Ax.db.update('cinmcomp', 
                {
                    empcode      : mObjCinmelem.empcode,
                    codinm       : mObjCinmelem.codinm,
                    codele       : mObjCinmelem.codele,
                    user_updated : mStrUserCode,
                    date_updated : new Ax.util.Date()
                }, 
                {
                    seqno : mIntSeqnoComp 
                }
            );
            
            Ax.db.commitWork();
        }else if (mStrTabori == "gcomfach" && mStrEstado != 'A'){
            // throw new Ax.ext.Exception('El registro debe tener estado Aplicado');
            throw `El registro debe tener estado Aplicado`;
        } else {
            throw `Solo es posible realizar traspaso para aquellos con origen gcomfach y estado Aplicado`;
        }

        
    } catch (error) { 
        Ax.db.rollbackWork();
        console.log(error);
        var mStrMensajeError = `${error.message || error}`;
        
        // throw `Error: [${mStrMensajeError}]`;
        throw new Ax.ext.Exception("Error: [${error}].",{error : mStrMensajeError});
    }

}


/**
 * METODO DESTINO ORIGINAL: codpar_empcode_codpre_estlinV
 */






