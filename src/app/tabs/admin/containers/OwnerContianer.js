import { RegistryFieldComponent } from '../components';
import { connect } from 'react-redux';
import { changeEditOwner } from '../actions';
import { getDomainOwner, setDomainOwner } from '../operations';
import { validateAddress } from '../../../validations';

const mapStateToProps = state => ({
  domain: state.auth.domain,
  getting: state.admin.owner.getting,
  value: state.admin.owner.value,
  editOpen: state.admin.owner.editOpen,
  editting: state.admin.owner.editting,
  validate: address => validateAddress(address, state.auth.network)
});

const mapDispatchToProps = dispatch => ({
  get: domain => dispatch(getDomainOwner(domain)),
  changeEdit: () => dispatch(changeEditOwner()),
  set: (domain, owner) => dispatch(setDomainOwner(domain, owner))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RegistryFieldComponent);
