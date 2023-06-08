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
 *  Version     : 1.0
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
function crp_traspaso_partida(pData, pField) {
    
    try { 
        Ax.db.beginWork();

        // ===============================================================
        // Data del formulario
        // mData {
        //          codpre      Presupuesto
        //          empcode     Empresa
        //          estado      Estado
        //          linid       Id. gasto
        //          tabori      Origen
        //          auxfec1     Id. componente
        //       }
        // ===============================================================
        var mData = Ax.util.js.object.assign({}, pData);

        // ===============================================================
        // Data del modal
        // mField {
        //          codpar      Codigo de la partida
        //       }
        // ===============================================================
        var mField = Ax.util.js.object.assign({}, pField);

        var mStrCodpar    = mField.codpar;
        var mStrCodpre    = mData.codpre;
        var mStrEmpcode   = mData.empcode;
        var mStrEstado    = mData.estado;
        var mIntLinid     = mData.linid;
        var mStrTabori    = mData.tabori;
        var mIntSeqnoComp = mData.auxfec1;
        
        if (mStrTabori == "gcomfach" && mStrEstado == 'A'){
        
            var mStrEstado = Ax.db.executeGet(`
                SELECT cpar_parprel.estado
                FROM cpar_parprel
                WHERE codpre  = ?
                AND codpar  = ?
                AND empcode = ?
            `, mStrCodpre, mStrCodpar, mStrEmpcode);
            
            if (mStrEstado != 'AC'){
                // throw new Ax.ext.Exception(`El estado de la partida a trasferir [${mStrCodpar}] se encuentra bloqueada.`);
                throw `El estado de la partida a trasferir [${mStrCodpar}] se encuentra bloqueada.`;
            }
        
            var mStrUserCode = Ax.ext.user.getCode();
        
            /**
             * Se actualiza en "Ingresos y gastos" la nueva partida
             **/
            Ax.db.update('cpar_premovi', 
                {
                    codpar       : mStrCodpar,
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
                    cinmelem.codele
                FROM cinmelem
                WHERE cinmelem.codpre  = ?
                AND cinmelem.codpar  = ?
                AND cinmelem.empcode = ?
            `,mStrCodpre, mStrCodpar, mStrEmpcode).toOne();
            
            /**
             * Se actualiza en el componente el nuevo bien y elemento relacionado
             * al presupuesto original y a la nueva partida
             **/
            Ax.db.update('cinmcomp', 
                {
                    codinm       : mObjCinmelem.codinm,
                    codele       : mObjCinmelem.codele,
                    user_updated : mStrUserCode,
                    date_updated : new Ax.util.Date()
                }, 
                {
                    seqno : mIntSeqnoComp 
                }
            );     
        }else if (mStrTabori == "gcomfach" && mStrEstado != 'A'){
            // throw new Ax.ext.Exception('El registro debe tener estado Aplicado[A]');
            throw `El registro debe tener estado Aplicado[A]`;
        }

        Ax.db.commitWork();
    } catch (error) { 
        Ax.db.rollbackWork();
        
        var mStrMensajeError = `${error.message || error}`;
        
        // throw `Error: [${mStrMensajeError}]`;
        throw new Ax.ext.Exception("Error: [${error}].",{error : mStrMensajeError});
    }

}
