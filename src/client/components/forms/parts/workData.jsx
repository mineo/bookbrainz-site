var React = require('react');
var Select = require('../../input/select.jsx');
var Input = require('react-bootstrap').Input;
var Button = require('react-bootstrap').Button;


var WorkData = React.createClass({
	getValue: function() {
		return {
			languages: this.refs.languages.getValue(),
			workType: this.refs.workType.getValue(),
			disambiguation: this.refs.disambiguation.getValue(),
			annotation: this.refs.annotation.getValue()
		};
	},
	valid: function() {
		return true;
	},
	render: function() {
		return (
			<div className={(this.props.visible === false) ? 'hidden': '' }>
				<h2>Add Data</h2>
				<p className='lead'>Fill out any data you know about the entity.</p>

				<div className='form-horizontal'>
					<Select
						label='Languages'
						labelAttribute='name'
						idAttribute='id'
						ref='languages'
						placeholder='Select work languages…'
						noDefault
						options={this.props.languages}
						multiple
						labelClassName='col-md-4'
						wrapperClassName='col-md-4' />
					<Select
						label='Type'
						labelAttribute='label'
						idAttribute='id'
						ref='workType'
						placeholder='Select work type…'
						noDefault
						options={this.props.workTypes}
						labelClassName='col-md-4'
						wrapperClassName='col-md-4' />
					<hr/>
					<Input
						type='text'
						label='Disambiguation'
						ref='disambiguation'
						labelClassName='col-md-3'
						wrapperClassName='col-md-6' />
					<Input
						type='textarea'
						label='Annotation'
						ref='annotation'
						labelClassName='col-md-3'
						wrapperClassName='col-md-6'
						rows='6' />
					<div className='form-group margin-top-1'>
						<div className='col-md-1'>
							<Button bsStyle='primary' block onClick={this.props.backClick}>
								<span className='fa fa-angle-double-left' /> Back
							</Button>
						</div>
						<div className='col-md-1 col-md-offset-10'>
							<Button bsStyle='success' block onClick={this.props.nextClick}>
								Next <span className='fa fa-angle-double-right' />
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}
});

module.exports = WorkData;
