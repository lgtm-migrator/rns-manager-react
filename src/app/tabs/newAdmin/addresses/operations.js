import Web3 from 'web3';
import { hash as namehash } from 'eth-ens-namehash';
import { formatsByCoinType } from '@ensdomains/address-encoder';

import {
  multiChainResolver as multiChainResolverAddress,
  publicResolver as publicResolverAddress,
  definitiveResolver as definitiveResolverAddress,
} from '../../../adapters/configAdapter';
import { gasPrice as defaultGasPrice } from '../../../adapters/gasPriceAdapter';

import {
  requestSetChainAddress, errorSetChainAddress, waitingSetChainAddress,
  requestChainAddress, receiveChainAddress, receiveSetChainAddress,
  errorChainAddress, clearAddresses, closeSetChainAddress,
} from './actions';
import { clearMigrateContent } from '../resolver/actions';

import { publicResolverAbi, multichainResolverAbi } from './abis.json';
import { definitiveResolverAbi } from '../resolver/definitiveAbis.json';

import transactionListener from '../../../helpers/transactionListener';
import networks from './networks.json';
import { PUBLIC_RESOLVER, MULTICHAIN_RESOLVER, DEFINITIVE_RESOLVER } from '../resolver/types';
import { ADDRESS_ENCODING_ERROR } from './types';
import { EMPTY_ADDRESS } from '../types';
import { sendBrowserNotification } from '../../../browerNotifications/operations';

/**
 * Helper Function to get the chain name with the ID
 * @param {chaindId} chaindId the chainId to be looked up
 */
export const getChainNameById = chainId => networks.find(net => net.id === chainId).name;

/**
 * Returns the index when given the chainId as per slip-0044
 * @param {chainId} chainId to lookup
 */
export const getIndexById = chainId => networks.find(net => net.id === chainId).index;

/**
 * Sets the RSK resolution when using the public resolver
 * @param {string} domain to set the address for
 * @param {address} address to resolve to
 */
const setPublicAddress = (domain, address, isNew) => async (dispatch) => {
  const accounts = await window.rLogin.request({ method: 'eth_accounts' });
  const currentAddress = accounts[0];
  const hash = namehash(domain);

  const web3 = new Web3(window.rLogin);
  const publicResolver = new web3.eth.Contract(
    publicResolverAbi, publicResolverAddress, { gasPrice: defaultGasPrice },
  );

  publicResolver.methods.setAddr(hash, address).send(
    { from: currentAddress }, (error, result) => {
      dispatch(waitingSetChainAddress('RSK'));
      if (error) {
        return dispatch(errorSetChainAddress('RSK', error.message));
      }

      return dispatch(transactionListener(
        result,
        listenerParams => listenerDispatch => listenerDispatch(receiveSetChainAddress(
          '0x80000089', 'RSK', listenerParams.address, listenerParams.resultTx, listenerParams.isNew,
        )),
        { address, isNew },
        listenerParams => listenerDispatch => listenerDispatch(
          errorSetChainAddress('RSK', listenerParams.errorReason),
        ),
      ));
    },
  );
};

/**
 * Sets an address in the multichain resolver
 * @param {string} domain to set the address for
 * @param {uint8} chainId that is assoicated with the address
 * @param {address} address the address or valud to set for the chainId
 * @param {bool} isNew is this a new entry?
 */
const setMultiChainAddress = (domain, chainId, address, isNew) => async (dispatch) => {
  const chainName = getChainNameById(chainId);
  dispatch(requestSetChainAddress(chainName));

  const accounts = await window.rLogin.request({ method: 'eth_accounts' });
  const currentAddress = accounts[0];
  const hash = namehash(domain);

  const web3 = new Web3(window.rLogin);
  const multichainResolver = new web3.eth.Contract(
    multichainResolverAbi, multiChainResolverAddress, { gasPrice: defaultGasPrice },
  );

  multichainResolver.methods.setChainAddr(hash, chainId, address).send(
    { from: currentAddress }, (error, result) => {
      dispatch(waitingSetChainAddress(chainName));
      if (error) {
        return dispatch(errorSetChainAddress(chainName, error.message));
      }

      const transactionConfirmed = listenerParams => (listenerDispatch) => {
        listenerDispatch(receiveSetChainAddress(
          listenerParams.chainId,
          getChainNameById(listenerParams.chainId),
          listenerParams.address,
          listenerParams.resultTx,
          listenerParams.isNew,
        ));

        // if deleting, close the error message programatically
        if (listenerDispatch.address === '' || listenerDispatch.address === EMPTY_ADDRESS) {
          listenerDispatch(closeSetChainAddress(listenerParams.chainName));
          sendBrowserNotification(listenerParams.domain, 'chain_address_removed');
        } else {
          sendBrowserNotification(listenerParams.domain, 'chain_address_updated');
        }
      };

      return dispatch(transactionListener(
        result,
        transactionConfirmed,
        {
          chainId, chainName, address, isNew, domain,
        },
        listenerParams => listenerDispatch => listenerDispatch(
          errorSetChainAddress(listenerParams.chainName, listenerParams.errorReason),
        ),
        { chainName },
      ));
    },
  );
};

/**
 * Sets values in the Definitive Resolver.
 * @param {string} domain the domain to be set
 * @param {uint8} chainId chain Id for the coin
 * @param {address} address address to be set
 * @param {bool} isNew is this a new address?
 */
const setDefinitiveAddress = (domain, chainId, address, isNew) => async (dispatch) => {
  const chainName = getChainNameById(chainId);
  dispatch(requestSetChainAddress(chainName));

  const chainIndex = getIndexById(chainId);
  const accounts = await window.rLogin.request({ method: 'eth_accounts' });
  const currentAddress = accounts[0];

  // encode value if it is not empty:
  let encodeValue = address;
  if (encodeValue !== EMPTY_ADDRESS) {
    try {
      encodeValue = formatsByCoinType[chainIndex].decoder(address);
    } catch (error) {
      return dispatch(errorSetChainAddress(chainName, ADDRESS_ENCODING_ERROR, address));
    }
  }
  const web3 = new Web3(window.rLogin);
  const definitiveResolver = new web3.eth.Contract(
    definitiveResolverAbi, definitiveResolverAddress, { gasPrice: defaultGasPrice },
  );

  return definitiveResolver.methods.setAddr(namehash(domain), chainIndex, encodeValue)
    .send({ from: currentAddress }, (error, result) => {
      dispatch(waitingSetChainAddress(chainName));
      if (error) {
        return dispatch(errorSetChainAddress(chainName, error.message));
      }

      const transactionConfirmed = listenerParams => (listenerDispatch) => {
        listenerDispatch(receiveSetChainAddress(
          listenerParams.chainId,
          listenerParams.chainName,
          listenerParams.address,
          listenerParams.resultTx,
          listenerParams.isNew,
        ));
        // if deleting, close the error message programatically
        if (listenerParams.address === '' || listenerParams.address === EMPTY_ADDRESS) {
          listenerDispatch(closeSetChainAddress(listenerParams.chainName));
          sendBrowserNotification(listenerParams.domain, 'coin_address_removed');
        } else {
          sendBrowserNotification(
            listenerParams.domain,
            listenerParams.isNew ? 'coin_address_added' : 'coin_address_updated',
          );
        }
      };

      return dispatch(transactionListener(
        result,
        transactionConfirmed,
        {
          chainId, chainName, address, isNew, domain,
        },
        listenerParams => listenerDispatch => listenerDispatch(
          errorSetChainAddress(listenerParams.chainName, listenerParams.errorReason),
        ),
        { chainName },
      ));
    });
};

/**
 * Selects the correct resolver set function based one resolverName
 * @param {string} domain the domain the address is for
 * @param {chainId} chainId the chainId to be set
 * @param {address} address the address for the chainId
 * @param {type} resolverName which resolver to use
 */
export const setChainAddress = (
  domain, chainId, address, resolverName, isNew,
) => async (dispatch) => {
  switch (resolverName) {
    case PUBLIC_RESOLVER:
      dispatch(setPublicAddress(domain, address.toLowerCase(), isNew));
      break;
    case MULTICHAIN_RESOLVER:
      dispatch(setMultiChainAddress(domain, chainId, address, isNew));
      break;
    case DEFINITIVE_RESOLVER:
      dispatch(setDefinitiveAddress(domain, chainId, address, isNew));
      break;
    default:
      // string resolver or unknown/custom resolver
  }
};

/**
 * Get the RSK resolved address using the Public Resolver
 * @param {string} domain the domain the address is for
 */
export const getPublicChainAddresses = domain => async (dispatch) => {
  dispatch(requestChainAddress());
  const hash = namehash(domain);

  const web3 = new Web3(window.rLogin);
  const publicResolver = new web3.eth.Contract(
    publicResolverAbi, publicResolverAddress, { gasPrice: defaultGasPrice },
  );

  return publicResolver.methods.addr(hash).call()
    .then(addr => dispatch(receiveChainAddress('0x80000089', 'RSK', addr)))
    .catch(error => dispatch(errorChainAddress('RSK', error.message)));
};

/**
 * Get the chain Address for a specific domian using the MultiChain Resolver
 * @param {string} domain the domain the address is for
 * @param {chainId} chainId the chainId requested
 */
export const getMultiChainAddresses = (domain, chainId) => async (dispatch) => {
  dispatch(requestChainAddress());

  const web3 = new Web3(window.rLogin);
  const multichainResolver = new web3.eth.Contract(
    multichainResolverAbi, multiChainResolverAddress, { gasPrice: defaultGasPrice },
  );

  const hash = namehash(domain);
  const chainName = getChainNameById(chainId);

  if (chainId === '0x80000089') {
    return multichainResolver.methods.addr(hash).call()
      .then(addr => dispatch(receiveChainAddress('0x80000089', 'RSK', addr)))
      .catch(error => dispatch(errorChainAddress('RSK', error.message)));
  }

  return multichainResolver.methods.chainAddr(hash, chainId).call()
    .then(addr => dispatch(receiveChainAddress(chainId, chainName, addr)))
    .catch(error => dispatch(errorChainAddress(chainName, error.message)));
};

/**
 * Get coin address from Definitive Resolver from a specified domain
 * @param {string} domain associated with the coin type
 * @param {chainId} chainId chainId of the coin
 */
export const getMultiCoinAddresses = (domain, chainId) => async (dispatch) => {
  dispatch(requestChainAddress());

  const hash = namehash(domain);
  const chainName = getChainNameById(chainId);
  const chainIndex = getIndexById(chainId);

  const web3 = new Web3(window.rLogin);
  const definitiveResolver = new web3.eth.Contract(
    definitiveResolverAbi, definitiveResolverAddress, { gasPrice: defaultGasPrice },
  );

  return definitiveResolver.methods.addr(hash, chainIndex).call()
    .then((addr) => {
      if (!addr || addr === EMPTY_ADDRESS) {
        return dispatch(receiveChainAddress(chainId, chainName, ''));
      }

      // eslint-disable-next-line new-cap
      const dataBuffer = new Buffer.from(addr.replace('0x', ''), 'hex');
      return dispatch(receiveChainAddress(
        chainId,
        chainName,
        formatsByCoinType[chainIndex].encoder(dataBuffer),
      ));
    })
    .catch(error => dispatch(errorChainAddress(chainName, error.message)));
};

/**
 * Gets chain addresses if the resolver is set to public or multichain.
 * In the case of multichain, it loops through all of the possible chainIds
 * and calls getChainAddress
 * @param {string} domain the domain to get the addresses
 * @param {type} resolverName which resolver to use
 */
export const getAllChainAddresses = (domain, resolverName) => (dispatch) => {
  dispatch(clearAddresses());
  dispatch(clearMigrateContent());
  switch (resolverName) {
    case PUBLIC_RESOLVER:
      dispatch(getPublicChainAddresses(domain));
      break;
    case MULTICHAIN_RESOLVER:
      networks.map((network) => {
        if (network.multi) {
          return dispatch(getMultiChainAddresses(domain, network.id));
        }
        return false;
      });
      break;
    case DEFINITIVE_RESOLVER:
      networks.map(network => dispatch(getMultiCoinAddresses(domain, network.id)));
      break;
    default:
      // string resolver or unknown/custom resolver
  }
};

/**
 * Chooses which resolver to use and then sets the value to '' or 0x0 depending on content
 * type and then passes the value to setChainAddress()
 * @param {string} domain the domain to get the addresses
 * @param {chainId} chainId the chainId requested
 * @param {type} resolverName which resolver to use
 */
export const deleteChainAddress = (domain, chainId, resolverName) => (dispatch) => {
  const isHex = networks.filter(net => net.id === chainId)[0].validation === 'HEX';
  const value = isHex ? EMPTY_ADDRESS : '';

  switch (resolverName) {
    case PUBLIC_RESOLVER:
      dispatch(setPublicAddress(domain, value));
      break;
    case MULTICHAIN_RESOLVER:
      dispatch(setMultiChainAddress(domain, chainId, value));
      break;
    case DEFINITIVE_RESOLVER:
      dispatch(setDefinitiveAddress(domain, chainId, EMPTY_ADDRESS));
      break;
    default:
      // string resolver or unknown/custom resolver
  }
};
