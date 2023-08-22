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
 *  JS:  crp_retroceder_gestion
 *  Version     : v1.2
 *  Date        : 22-08-2023
 *  Description : Función que retrocede el proceso de generación de gestión sobre cartera de efectos.
 *
 *  CALLED FROM:
 *  ==================
 *      Obj: crp_detalle_extracto_banc              A través de la acción '	ACTION_86'
 *
 *  PARAMETERS:
 *  ==================
 *
 *                @param    {object}    pObjData        Objeto con informacion de data
 *
 **/
function crp_retroceder_gestion(pObjData) {

    /**
     * pObjData {
     *     file_seqno:  Identificador de fichero
     *     auxnum1:     Identificador de la gestión
     *  }
     */
    var mObjData = Ax.util.js.object.assign({}, pObjData);

    var mIntIdFile = mObjData.file_seqno;   // Id Fichero
    var mIntIdGestion = mObjData.auxnum1;   // Id Gestion

    /**
     * Abre la gestion
     */
    Ax.db.call("cefecges_estado_ret", mIntIdGestion);

    /**
     * Desagrega efectos relacionados
     */
    Ax.db.execute(`DELETE FROM cefecges_det 
                    WHERE pcs_seqno = ${mIntIdGestion}`);

    /**
     * Elimina la gestion
     */
    Ax.db.execute(`
        DELETE cefecges_pcs WHERE cefecges_pcs.pcs_seqno = ${mIntIdGestion}
    `);

    /**
     * Elimina los detalles
     */
    Ax.db.execute(`
        DELETE crp_det_extrac_banc_line WHERE file_seqno = ${mIntIdFile}
    `);

    /**
     * Cambia el estado de los efectos observados y aprobados a NS
     */
    /*var mArrEfectos = Ax.db.executeCachedQuery(`
        <select>
            <columns>
                cefectos.numero
            </columns>
            <from table='cefecges_det'>
                <join table='cefectos'>
                    <on>cefecges_det.det_numero = cefectos.numero</on>
                </join>
            </from>
            <where>
                cefecges_det.pcs_seqno IN (${mIntIdGestion})
            </where>
        </select>
    `).toJSONArray();

    mArrEfectos.forEach(mObjEfecto => {
        Ax.db.execute(`
            UPDATE cefectos SET estado = 'PE' WHERE numero = ${mObjEfecto.numero}
        `);
    }); */





    /**
     * Elimina la gestion de Autorizados
     */
    // Ax.db.execute(`
    //     DELETE cefecges_pcs WHERE cefecges_pcs.pcs_seqno = ${mIntIdPAUS}
    // `);

    /**
     * Actualiza estado, id gestion de observados e id gestion de autorizados
     */
    Ax.db.execute(`
        UPDATE crp_detalle_extracto_banc SET file_status = 'P', auxnum1 = 0, file_memo = '' WHERE file_seqno = ${mIntIdFile}
    `);
}
