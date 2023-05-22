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
 *  -----------------------------------------------------------------------------
 *  JS: crp_enviar_xdoccta
 *      Version:     V1.0
 *      Date:        2023.05.11                                          
 *      Description: Carga las cuentas contables asociados a la factura de compra  
 *                   enviada a través del xdocpro.
 *  CALLED FROM:
 *  ==============
 *      JS:          enviarXdocpro
 * 
 *  PARAMETERS:
 *  =============
 * 
 *      @param   {string}   pStrProtocolo      Código de protocolo de que agrupa un 
 *                                             un conjunto de facturas de compras.
 * 
 */
function crp_enviar_xdoccta(pStrProtocolo) {
    
	const mStrDb = Ax.db.of('BD_CRP_INT_AXIONAL');

	// ===============================================================
    // TABLA TEMPORAL PARA ALBARANES
    // ===============================================================
    let mStrTmpXdoccta = Ax.db.getTempTableName(`@tmp_tbl_xdoccta`);
    Ax.db.execute(`DROP TABLE IF EXISTS ${mStrTmpXdoccta}`);

    Ax.db.execute(`
        <select intotemp='${mStrTmpXdoccta}'>
            <columns>
                gcomfach.cabid,
                gcomalbh.loteid, 
                MAX( gcomfach.auxchr5 || gcomfach.auxnum1 )                                 <alias name='dnrorec' />, 
                MAX( CASE WHEN capuntes.cuenta LIKE '60%' THEN crp_chv_mapcta.ctaori 
                        ELSE ''
                    END )                                                                   <alias name='dctagas' />, 
                MAX( CASE WHEN capuntes.cuenta LIKE '61%' THEN crp_chv_mapcta.ctaori
                        ELSE ''
                    END )                                                                   <alias name='dctacos' />, 
                MAX( CASE WHEN capuntes.cuenta LIKE '25%' THEN crp_chv_mapcta.ctaori
                        ELSE ''
                    END )                                                                   <alias name='dctaexi' />, 
                SUM( CASE WHEN (capuntes.cuenta LIKE '60%' 
                                OR capuntes.cuenta LIKE '61%' 
                                OR capuntes.cuenta LIKE '25%') THEN capuntes.debe + capuntes.haber 
                        ELSE 0 
                    END )                                                                   <alias name='dvalor' />,
                MAX (capuntes.concep )                                                      <alias name='dglosa' />
            </columns>
            <from table='gcomfach'>
                <join table='gcomalbh'>
                    <on>gcomalbh.cabid IN (SELECT gcomfacl.cabori FROM gcomfacl WHERE gcomfacl.cabid  = gcomfach.cabid AND gcomfacl.tabori = 'gcommovh')</on> 
                    <join table='capuntes'>
                        <on>gcomalbh.loteid = capuntes.loteid</on> 
                        <join type='left' table='crp_chv_mapcta'>
                            <on>capuntes.cuenta = crp_chv_mapcta.cuenta</on>
                        </join> 
                    </join>
                </join>
            </from>
            <where>
                gcomfach.auxchr5 = ?
                AND gcomalbh.fconta IS NOT NULL
            </where>
            <group> 1, 2 </group>
            <order> 1, 2 </order>
        </select>
    `, pStrProtocolo);



    var mRsXdoccta = Ax.db.executeQuery(`
        <select>
            <columns>
                xdoccta.dnrorec,
                xdoccta.dctagas,
                xdoccta.dctacos,
                xdoccta.dctaexi,
                xdoccta.dvalor,
                xdoccta.dglosa
            </columns>
            <from table='${mStrTmpXdoccta}' alias = 'xdoccta'/>
        </select>
    `);

    var mObjEstado  = {estado_axi: 0};
    var mStrUser    = Ax.db.getUser();
    var mDateToday  = new Ax.sql.Date();
	var mIntCount   = 0;
	for(var mRowXdoccta of mRsXdoccta){

		mStrDb.insert('xdoccta', mRowXdoccta);
        
		Ax.db.insert('crp_chv_xdoccta', Object.assign(mRowXdoccta, mObjEstado));

		mIntCount++;
	}

    Ax.db.execute(
        `UPDATE crp_chv_xdoccta 
            SET estado_axi = 1, 
                user_updated = ?, 
                date_updated = ? 
            WHERE dnrorec LIKE '${pStrProtocolo}%' `,
        mStrUser, mDateToday);

	return mIntCount;
}