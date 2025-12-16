import { TestBed } from '@angular/core/testing';

import { ReparacaoService } from './reparacao.service';

describe('ReparacaoService', () => {
  let service: ReparacaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReparacaoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
