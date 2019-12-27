import Web3 from 'web3';
import {
  requestRenewDomain, receiveRenewDomain, errorRenewDomain,
} from './actions';
import { getRenewData } from './helpers';
import abi from './abi.json';
import {
  rif as rifAddress,
  gasPrice as defaultGasPrice,
  renewer as renewerAddress,
} from '../../../config/contracts.json';
import { notifyError, notifyTx, txTypes } from '../../notifications';

export default (domain, tokens, duration) => async (dispatch) => {
  dispatch(requestRenewDomain());

  const durationBN = window.web3.toBigNumber(duration);
  const weiValue = tokens * (10 ** 18);
  const accounts = await window.ethereum.enable();
  const currentAddress = accounts[0];

  const data = getRenewData(domain, durationBN);

  const web3 = new Web3(window.ethereum);
  const rif = new web3.eth.Contract(
    abi, rifAddress, { from: currentAddress, gasPrice: defaultGasPrice },
  );

  return new Promise((resolve) => {
    rif
      .methods
      .transferAndCall(renewerAddress, weiValue.toString(), data)
      .send((error, result) => {
        if (error) {
          dispatch(errorRenewDomain());
          return resolve(dispatch(notifyError(error.message)));
        }

        dispatch(receiveRenewDomain());
        return resolve(dispatch(notifyTx(result, '', { type: txTypes.RENEW_DOMAIN })));
      });
  });
};